import type { PublicPlayer, ServerMessage } from "@repo/shared";
import { type FeedEntry, type GameState, type InitArgs, selectYou } from "./types";

type LocalAction = { type: "conn"; connected: boolean } | { type: "typed"; value: string };

type Action = ServerMessage | LocalAction;

const seedSelf = (youId: string, nickname: string): PublicPlayer => ({
  id: youId,
  nickname,
  isHost: false,
  isAi: false,
  connected: true,
  score: 0,
  streak: 0,
  multiplier: 1,
  livesLeft: null,
  hintsUsedTotal: 0,
});

// Seed enough room shape for the lobby to render before the first room_state
// (which lands within a few ms of the socket opening and overwrites this).
export const initialState = (a: InitArgs): GameState => ({
  status: "lobby",
  youId: a.youId,
  room: {
    type: "room_state",
    roomCode: a.roomCode,
    gameId: a.gameId,
    mode: a.mode,
    status: "waiting",
    host: { id: a.youId, nickname: a.nickname },
    settings: a.settings,
    players: [seedSelf(a.youId, a.nickname)],
    currentRoundIndex: null,
    totalRounds: a.settings.chainLength,
  },
  round: null,
  roundEnd: null,
  gameOver: null,
  feed: [],
  history: [],
  eliminated: false,
  connected: false,
});

const patchPlayer = (state: GameState, id: string, patch: Partial<PublicPlayer>): PublicPlayer[] =>
  state.room.players.map((p) => (p.id === id ? { ...p, ...patch } : p));

export const reducer = (state: GameState, action: Action): GameState => {
  switch (action.type) {
    case "conn":
      return { ...state, connected: action.connected };

    case "typed": {
      if (!state.round || state.round.you.lock) return state;
      return {
        ...state,
        round: {
          ...state.round,
          you: { ...state.round.you, typed: action.value, nearMiss: false, hintError: null },
        },
      };
    }

    case "room_state": {
      // Authoritative room snapshot. Don't downgrade out of an active round —
      // game_over owns the transition to "over".
      const status =
        state.status === "lobby" && action.status === "playing" ? "playing" : state.status;
      return { ...state, room: action, status };
    }

    case "round_start": {
      const players = patchPlayer(state, state.youId, {
        score: action.yourState.points,
        streak: action.yourState.streak,
        multiplier: action.yourState.multiplier,
        livesLeft: action.yourState.livesLeft,
      });
      return {
        ...state,
        status: "playing",
        roundEnd: null,
        feed: [],
        room: {
          ...state.room,
          status: "playing",
          currentRoundIndex: action.roundIndex,
          players,
        },
        round: {
          index: action.roundIndex,
          start: action,
          lockedIds: [],
          you: {
            typed: "",
            nearMiss: false,
            hints: [],
            hintsUsed: 0,
            cooldownUntil: null,
            hintError: null,
            lock: null,
          },
        },
      };
    }

    case "answer_result": {
      const round = state.round;
      if (!round || round.index !== action.roundIndex) return state;
      const you = selectYou(state);
      const players = patchPlayer(state, state.youId, {
        score: action.newAccumulated,
        streak: action.newStreak,
        multiplier: action.newMultiplier,
      });
      const feed: FeedEntry[] = action.correct
        ? [
            {
              id: `f-${state.youId}-${action.roundIndex}`,
              playerId: state.youId,
              nickname: you.nickname,
              isYou: true,
              roundScore: action.roundScore,
            },
            ...state.feed,
          ]
        : state.feed;
      return {
        ...state,
        room: { ...state.room, players },
        feed,
        round: {
          ...round,
          lockedIds: round.lockedIds.includes(state.youId)
            ? round.lockedIds
            : [...round.lockedIds, state.youId],
          you: {
            ...round.you,
            nearMiss: false,
            lock: { correct: action.correct, roundScore: action.roundScore },
          },
        },
      };
    }

    case "player_locked": {
      const round = state.round;
      if (!round || round.index !== action.roundIndex) return state;
      if (action.playerId === state.youId || round.lockedIds.includes(action.playerId))
        return state;
      return { ...state, round: { ...round, lockedIds: [...round.lockedIds, action.playerId] } };
    }

    case "hint_revealed": {
      const round = state.round;
      if (!round || round.index !== action.roundIndex) return state;
      const you = selectYou(state);
      // First hint breaks the streak; server already deducted points (pointsRemaining).
      const players = patchPlayer(state, state.youId, {
        score: action.pointsRemaining,
        streak: 0,
        multiplier: 1,
        hintsUsedTotal: you.hintsUsedTotal + 1,
      });
      return {
        ...state,
        room: { ...state.room, players },
        round: {
          ...round,
          you: {
            ...round.you,
            hints: [...round.you.hints, { index: action.index, char: action.char }],
            hintsUsed: action.hintsUsedNow,
            cooldownUntil: action.cooldownExpiresAt,
            hintError: null,
          },
        },
      };
    }

    case "round_end": {
      const players = state.room.players.map((p) => {
        const pr = action.perPlayer.find((x) => x.playerId === p.id);
        return pr
          ? {
              ...p,
              score: pr.totalScore,
              streak: pr.streak,
              multiplier: pr.multiplier,
              livesLeft: pr.livesLeft,
            }
          : p;
      });

      const start = state.round?.start;
      const compound = start
        ? start.visibleSide === "left"
          ? `${start.visibleWord}${action.answer}`
          : `${action.answer}${start.visibleWord}`
        : action.answer;

      const youPr = action.perPlayer.find((x) => x.playerId === state.youId);
      const history = state.history.some((h) => h.index === action.roundIndex)
        ? state.history
        : [
            ...state.history,
            {
              index: action.roundIndex,
              compound: compound.toLowerCase(),
              youCorrect: youPr?.correct ?? false,
            },
          ];

      // Opponent scores are only known now — fill the slate (you were added live).
      const oppFeed: FeedEntry[] = action.perPlayer
        .filter((pr) => pr.correct && pr.playerId !== state.youId)
        .map((pr) => ({
          id: `f-${pr.playerId}-${action.roundIndex}`,
          playerId: pr.playerId,
          nickname: players.find((p) => p.id === pr.playerId)?.nickname ?? "Player",
          isYou: false,
          roundScore: pr.roundScore,
        }));

      const eliminated =
        state.eliminated || (state.room.settings.elimination && youPr?.livesLeft === 0);

      return {
        ...state,
        status: "interlude",
        room: { ...state.room, players },
        roundEnd: action,
        history,
        feed: [...oppFeed, ...state.feed],
        eliminated,
      };
    }

    case "game_over":
      return {
        ...state,
        status: "over",
        gameOver: action,
        room: { ...state.room, status: "finished" },
      };

    case "error": {
      const round = state.round;
      if (!round) return state;
      if (action.code === "EDIT_DISTANCE_RETRY") {
        return { ...state, round: { ...round, you: { ...round.you, nearMiss: true } } };
      }
      if (
        action.code === "HINT_COOLDOWN" ||
        action.code === "HINTS_EXHAUSTED" ||
        action.code === "INSUFFICIENT_POINTS"
      ) {
        return { ...state, round: { ...round, you: { ...round.you, hintError: action.code } } };
      }
      return state;
    }

    default:
      // time_sync / ai_event are handled in the socket or ignored.
      return state;
  }
};
