import type { GameSettings, PublicPlayer, RoundEndMsg } from "@repo/shared";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import {
  buildGameOver,
  buildRoundEnd,
  buildRoundStart,
  computeRoundScore,
  DEFAULT_SETTINGS,
  initialRoom,
  makeOpponent,
  nextMultiplier,
  RULES,
  roundSpec,
  YOU_ID,
} from "./fixtures";

// ─── Client-side view state (server messages projected into what screens read) ─
type YouRound = {
  typed: string;
  nearMiss: boolean;
  hints: Array<{ index: number; char: string }>;
  hintsUsed: number;
  cooldownUntil: number | null;
  hintError: string | null;
  lock: null | { correct: boolean; roundScore: number; accumulated: number; lockedAt: number };
};

type RoundLock = {
  correct: boolean;
  roundScore: number;
  hintsUsed: number;
  lockedAt: number;
};

type RoundView = {
  index: number;
  start: ReturnType<typeof buildRoundStart>;
  hiddenWord: string;
  phase: "armed" | "open";
  lockedIds: Record<string, RoundLock>;
  livesDeducted: string[];
  you: YouRound;
};

export type FeedEntry = {
  id: string;
  playerId: string;
  nickname: string;
  isYou: boolean;
  roundScore: number;
};

type GameStatus = "lobby" | "playing" | "interlude" | "over";

export type RoundHistory = { index: number; compound: string; youCorrect: boolean };

type MockState = {
  status: GameStatus;
  room: ReturnType<typeof initialRoom>;
  round: RoundView | null;
  roundEnd: RoundEndMsg | null;
  gameOver: ReturnType<typeof buildGameOver> | null;
  feed: FeedEntry[];
  history: RoundHistory[];
  eliminated: boolean;
  connected: boolean;
};

const freshYouRound = (): YouRound => ({
  typed: "",
  nearMiss: false,
  hints: [],
  hintsUsed: 0,
  cooldownUntil: null,
  hintError: null,
  lock: null,
});

const getYou = (players: PublicPlayer[]): PublicPlayer => {
  const you = players.find((p) => p.id === YOU_ID) ?? players[0];
  if (!you) throw new Error("no players");
  return you;
};

// near-miss: edit distance ≤1, first letter matches, hidden ≥5 chars (mirror answer-validator)
const isNearMiss = (guess: string, answer: string) => {
  const g = guess.trim().toUpperCase();
  const a = answer.toUpperCase();
  if (a.length < 5 || g.length === 0 || g[0] !== a[0] || g === a) return false;
  // cheap edit-distance ≤1 check
  if (Math.abs(g.length - a.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < g.length && j < a.length) {
    if (g[i] === a[j]) {
      i++;
      j++;
    } else {
      edits++;
      if (edits > 1) return false;
      if (g.length > a.length) i++;
      else if (g.length < a.length) j++;
      else {
        i++;
        j++;
      }
    }
  }
  edits += g.length - i + (a.length - j);
  return edits <= 1;
};

// ─── Actions ───────────────────────────────────────────────────────────────
type Action =
  | { t: "hydrate"; settings: GameSettings; youIsHost: boolean; roomCode: string; gameId: string }
  | { t: "setSettings"; settings: GameSettings }
  | { t: "addPlayer" }
  | { t: "removePlayer" }
  | { t: "roundStart"; now: number; index: number }
  | { t: "arm" }
  | { t: "type"; value: string }
  | { t: "submit"; now: number }
  | { t: "hint"; now: number }
  | { t: "opponentsSolve"; now: number; count: number }
  | { t: "resolve"; now: number }
  | { t: "advance"; now: number }
  | { t: "eliminateYou" }
  | { t: "endGame" }
  | { t: "setConnected"; connected: boolean }
  | { t: "reset" };

const withLives = (players: PublicPlayer[], settings: GameSettings): PublicPlayer[] =>
  players.map((p) => ({
    ...p,
    livesLeft: settings.elimination ? (settings.lives ?? RULES.LIVES_DEFAULT) : null,
  }));

function reducer(state: MockState, a: Action): MockState {
  switch (a.t) {
    case "hydrate": {
      return {
        ...initialState(a.settings, a.youIsHost, a.roomCode, a.gameId),
      };
    }

    case "setSettings": {
      return {
        ...state,
        room: {
          ...state.room,
          settings: a.settings,
          totalRounds: a.settings.chainLength,
          players: state.room.players,
        },
      };
    }

    case "addPlayer": {
      const idx = state.room.players.length;
      return {
        ...state,
        room: { ...state.room, players: [...state.room.players, makeOpponent(idx)] },
      };
    }

    case "removePlayer": {
      const players = state.room.players;
      // remove the last non-you, non-host player
      const removable = [...players].reverse().find((p) => p.id !== YOU_ID && !p.isHost);
      if (!removable) return state;
      return {
        ...state,
        room: { ...state.room, players: players.filter((p) => p.id !== removable.id) },
      };
    }

    case "roundStart": {
      const players = withLives(state.room.players, state.room.settings);
      const you = getYou(players);
      const start = buildRoundStart({
        roundIndex: a.index,
        settings: state.room.settings,
        you,
        now: a.now,
      });
      const spec = roundSpec(a.index);
      return {
        ...state,
        status: "playing",
        roundEnd: null,
        feed: [],
        room: {
          ...state.room,
          status: "playing",
          players,
          currentRoundIndex: a.index,
        },
        round: {
          index: a.index,
          start,
          hiddenWord: spec.hiddenWord.toUpperCase(),
          phase: "armed",
          lockedIds: {},
          livesDeducted: [],
          you: freshYouRound(),
        },
      };
    }

    case "arm": {
      if (!state.round) return state;
      return { ...state, round: { ...state.round, phase: "open" } };
    }

    case "type": {
      if (!state.round || state.round.you.lock) return state;
      return {
        ...state,
        round: {
          ...state.round,
          you: { ...state.round.you, typed: a.value, nearMiss: false, hintError: null },
        },
      };
    }

    case "submit": {
      const round = state.round;
      if (!round || round.you.lock || round.phase !== "open") return state;
      const guess = round.you.typed.trim().toUpperCase();
      if (!guess) return state;
      const answer = round.hiddenWord;
      const correct = guess === answer;

      if (!correct && isNearMiss(guess, answer)) {
        // EDIT_DISTANCE_RETRY — no lock
        return {
          ...state,
          round: { ...round, you: { ...round.you, nearMiss: true } },
        };
      }

      const elapsed = a.now - round.start.roundStartsAt;
      const usedHint = round.you.hintsUsed > 0;
      const you = getYou(state.room.players);
      const roundScore = correct
        ? computeRoundScore(elapsed, state.room.settings.roundTimeMs, you.multiplier)
        : 0;

      const players = state.room.players.map((p) => {
        if (p.id !== YOU_ID) return p;
        const newStreak = correct && !usedHint ? p.streak + 1 : 0;
        const newMultiplier = correct && !usedHint ? nextMultiplier(p.multiplier) : 1;
        return {
          ...p,
          score: p.score + roundScore,
          streak: newStreak,
          multiplier: newMultiplier,
        };
      });

      return {
        ...state,
        room: { ...state.room, players },
        round: {
          ...round,
          lockedIds: {
            ...round.lockedIds,
            [YOU_ID]: { correct, roundScore, hintsUsed: round.you.hintsUsed, lockedAt: a.now },
          },
          you: {
            ...round.you,
            lock: { correct, roundScore, accumulated: getYou(players).score, lockedAt: a.now },
          },
        },
        feed: correct
          ? [
              {
                id: `f-you-${a.now}`,
                playerId: YOU_ID,
                nickname: you.nickname,
                isYou: true,
                roundScore,
              },
              ...state.feed,
            ]
          : state.feed,
      };
    }

    case "hint": {
      const round = state.round;
      if (!round || round.you.lock || round.phase !== "open") return state;
      const you = getYou(state.room.players);
      const { maxHints } = round.start;
      if (round.you.hintsUsed >= maxHints) {
        return {
          ...state,
          round: { ...round, you: { ...round.you, hintError: "HINTS_EXHAUSTED" } },
        };
      }
      if (you.score < RULES.HINT_COST) {
        return {
          ...state,
          round: { ...round, you: { ...round.you, hintError: "INSUFFICIENT_POINTS" } },
        };
      }
      if (round.you.cooldownUntil && a.now < round.you.cooldownUntil) {
        return { ...state, round: { ...round, you: { ...round.you, hintError: "HINT_COOLDOWN" } } };
      }
      const nextIndex = round.you.hintsUsed + 1; // reveal char at position hintsUsed+1 (0 already shown)
      const char = round.hiddenWord[nextIndex] ?? "";
      const players = state.room.players.map((p) =>
        p.id === YOU_ID
          ? {
              ...p,
              score: p.score - RULES.HINT_COST,
              streak: 0,
              multiplier: 1,
              hintsUsedTotal: p.hintsUsedTotal + 1,
            }
          : p,
      );
      return {
        ...state,
        room: { ...state.room, players },
        round: {
          ...round,
          you: {
            ...round.you,
            hints: [...round.you.hints, { index: nextIndex, char }],
            hintsUsed: round.you.hintsUsed + 1,
            cooldownUntil: a.now + round.start.hintCooldownMs,
            hintError: null,
          },
        },
      };
    }

    case "opponentsSolve": {
      const round = state.round;
      if (!round || round.phase !== "open") return state;
      const candidates = state.room.players.filter(
        (p) => p.id !== YOU_ID && !round.lockedIds[p.id],
      );
      const chosen = candidates.slice(0, a.count);
      if (chosen.length === 0) return state;

      const lockedIds = { ...round.lockedIds };
      const feedAdds: FeedEntry[] = [];
      const players = state.room.players.map((p) => {
        if (!chosen.some((c) => c.id === p.id)) return p;
        const jitter = 0.4 + Math.random() * 0.55;
        const elapsed = (a.now - round.start.roundStartsAt) * jitter;
        const roundScore = computeRoundScore(
          elapsed,
          state.room.settings.roundTimeMs,
          p.multiplier,
        );
        lockedIds[p.id] = { correct: true, roundScore, hintsUsed: 0, lockedAt: a.now };
        feedAdds.push({
          id: `f-${p.id}-${a.now}`,
          playerId: p.id,
          nickname: p.nickname,
          isYou: false,
          roundScore,
        });
        return {
          ...p,
          score: p.score + roundScore,
          streak: p.streak + 1,
          multiplier: nextMultiplier(p.multiplier),
        };
      });

      return {
        ...state,
        room: { ...state.room, players },
        round: { ...round, lockedIds },
        feed: [...feedAdds, ...state.feed],
      };
    }

    case "resolve": {
      const round = state.round;
      if (!round) return state;
      const elimination = state.room.settings.elimination;

      const players = state.room.players.map((p) => {
        const lock = round.lockedIds[p.id];
        const failed = !lock?.correct;
        if (elimination && failed && p.livesLeft != null && p.livesLeft > 0) {
          return { ...p, livesLeft: p.livesLeft - 1, streak: 0, multiplier: 1 };
        }
        if (failed && p.id !== YOU_ID && !lock) {
          return { ...p, streak: 0, multiplier: 1 };
        }
        return p;
      });

      const perRound = new Map(
        players.map((p) => {
          const lock = round.lockedIds[p.id];
          return [
            p.id,
            {
              correct: lock?.correct ?? false,
              locked: !!lock,
              lockedAt: lock?.lockedAt ?? null,
              roundScore: lock?.roundScore ?? 0,
              hintsUsed: lock?.hintsUsed ?? 0,
            },
          ];
        }),
      );

      const isLast = round.index >= state.room.settings.chainLength - 1;
      const nextRoundStartsAt = isLast ? null : a.now + RULES.INTERLUDE_MS;
      const roundEnd = buildRoundEnd({
        roundIndex: round.index,
        hiddenWord: round.hiddenWord,
        players,
        perRound,
        nextRoundStartsAt,
      });

      const youLives = players.find((p) => p.id === YOU_ID)?.livesLeft ?? null;
      const eliminated = state.eliminated || (elimination && youLives === 0);

      const spec = roundSpec(round.index);
      const compound =
        spec.visibleSide === "left"
          ? `${spec.visibleWord}${spec.hiddenWord}`
          : `${spec.hiddenWord}${spec.visibleWord}`;
      const historyEntry: RoundHistory = {
        index: round.index,
        compound: compound.toLowerCase(),
        youCorrect: round.lockedIds[YOU_ID]?.correct ?? false,
      };

      return {
        ...state,
        status: "interlude",
        room: { ...state.room, players },
        roundEnd,
        history: [...state.history, historyEntry],
        eliminated,
      };
    }

    case "advance": {
      const isLast = (state.round?.index ?? 0) >= state.room.settings.chainLength - 1;
      if (isLast) {
        return {
          ...state,
          status: "over",
          gameOver: buildGameOver(state.room.gameId, state.room.players),
          room: { ...state.room, status: "finished" },
        };
      }
      // next round starts via roundStart action dispatched by scheduler
      return state;
    }

    case "eliminateYou": {
      const players = state.room.players.map((p) =>
        p.id === YOU_ID ? { ...p, livesLeft: 0, streak: 0, multiplier: 1 } : p,
      );
      return { ...state, room: { ...state.room, players }, eliminated: true };
    }

    case "endGame": {
      return {
        ...state,
        status: "over",
        gameOver: buildGameOver(state.room.gameId, state.room.players),
        room: { ...state.room, status: "finished" },
      };
    }

    case "setConnected":
      return { ...state, connected: a.connected };

    case "reset":
      return initialState(DEFAULT_SETTINGS, true, state.room.roomCode, state.room.gameId);

    default:
      return state;
  }
}

const initialState = (
  settings: GameSettings,
  youIsHost: boolean,
  roomCode: string,
  gameId: string,
): MockState => ({
  status: "lobby",
  room: initialRoom({ roomCode, gameId, settings, youIsHost }),
  round: null,
  roundEnd: null,
  gameOver: null,
  feed: [],
  history: [],
  eliminated: false,
  connected: true,
});

// ─── Context + provider ──────────────────────────────────────────────────────
type MockActions = {
  setSettings: (s: GameSettings) => void;
  addPlayer: () => void;
  removePlayer: () => void;
  startGame: () => void;
  typeGuess: (v: string) => void;
  submitGuess: () => void;
  requestHint: () => void;
  simulateOpponentSolves: (k: number) => void;
  advanceRound: () => void;
  eliminateYou: () => void;
  endGame: () => void;
  toggleConnected: () => void;
  reset: () => void;
};

type Ctx = { state: MockState; actions: MockActions };
const MockGameContext = createContext<Ctx | null>(null);

type ProviderProps = {
  children: ReactNode;
  roomCode: string;
  gameId?: string;
  settings?: GameSettings;
  youIsHost?: boolean;
};

export const MockGameProvider = ({
  children,
  roomCode,
  gameId = "g-mock",
  settings = DEFAULT_SETTINGS,
  youIsHost = true,
}: ProviderProps) => {
  const [state, dispatch] = useReducer(reducer, { settings, youIsHost, roomCode, gameId }, (init) =>
    initialState(init.settings, init.youIsHost, init.roomCode, init.gameId),
  );

  const stateRef = useRef(state);
  stateRef.current = state;
  const timers = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const runRoundRef = useRef<(index: number) => void>(() => {});

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(
      () => {
        timers.current.delete(id);
        fn();
      },
      Math.max(0, ms),
    );
    timers.current.add(id);
    return id;
  }, []);

  const clearTimers = useCallback(() => {
    for (const id of timers.current) clearTimeout(id);
    timers.current.clear();
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  // advance to next round, or to game-over on the last round
  const goNext = useCallback(() => {
    const s = stateRef.current;
    const isLast = (s.round?.index ?? 0) >= s.room.settings.chainLength - 1;
    if (isLast) {
      dispatch({ t: "advance", now: Date.now() });
    } else {
      const next = (s.round?.index ?? 0) + 1;
      dispatch({ t: "advance", now: Date.now() });
      runRoundRef.current(next);
    }
  }, []);

  // resolve the open round, then auto-advance after the interlude beat
  const resolveAndContinue = useCallback(() => {
    if (stateRef.current.status === "playing") dispatch({ t: "resolve", now: Date.now() });
    schedule(goNext, RULES.INTERLUDE_MS);
  }, [schedule, goNext]);

  // run a round: arm (lead) → open → auto-resolve at timeout
  const runRound = useCallback(
    (index: number) => {
      dispatch({ t: "roundStart", now: Date.now(), index });
      schedule(() => dispatch({ t: "arm" }), RULES.LEAD_MS);
      const roundMs = stateRef.current.room.settings.roundTimeMs;
      schedule(() => {
        if (stateRef.current.status === "playing") resolveAndContinue();
      }, RULES.LEAD_MS + roundMs);
    },
    [schedule, resolveAndContinue],
  );

  useEffect(() => {
    runRoundRef.current = runRound;
  }, [runRound]);

  const actions = useMemo<MockActions>(
    () => ({
      setSettings: (s) => dispatch({ t: "setSettings", settings: s }),
      addPlayer: () => dispatch({ t: "addPlayer" }),
      removePlayer: () => dispatch({ t: "removePlayer" }),
      startGame: () => {
        clearTimers();
        runRound(0);
      },
      typeGuess: (v) => dispatch({ t: "type", value: v }),
      submitGuess: () => dispatch({ t: "submit", now: Date.now() }),
      requestHint: () => dispatch({ t: "hint", now: Date.now() }),
      simulateOpponentSolves: (k) => dispatch({ t: "opponentsSolve", now: Date.now(), count: k }),
      advanceRound: () => {
        clearTimers();
        const s = stateRef.current;
        if (s.status === "playing") resolveAndContinue();
        else if (s.status === "interlude") goNext();
      },
      eliminateYou: () => dispatch({ t: "eliminateYou" }),
      endGame: () => {
        clearTimers();
        dispatch({ t: "endGame" });
      },
      toggleConnected: () =>
        dispatch({ t: "setConnected", connected: !stateRef.current.connected }),
      reset: () => {
        clearTimers();
        dispatch({ t: "reset" });
      },
    }),
    [clearTimers, runRound, resolveAndContinue, goNext],
  );

  const value = useMemo(() => ({ state, actions }), [state, actions]);
  return <MockGameContext.Provider value={value}>{children}</MockGameContext.Provider>;
};

export const useMockGame = () => {
  const ctx = useContext(MockGameContext);
  if (!ctx) throw new Error("useMockGame must be used within MockGameProvider");
  return ctx;
};

// ─── Selectors screens use (kept tiny + colocated) ───────────────────────────
export const selectYou = (s: MockState) => getYou(s.room.players);
export const selectLeaderboard = (s: MockState) =>
  [...s.room.players].sort((a, b) => b.score - a.score);
