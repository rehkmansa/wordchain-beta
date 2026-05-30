import type {
  GameOverMsg,
  GameSettings,
  PublicPlayer,
  RoomStateMsg,
  RoundEndMsg,
  RoundStartMsg,
} from "@repo/shared";

// ─── Backend-mirrored constants (docs/DESIGN.md, apps/backend) ───────────────
export const RULES = {
  BASE_POINTS: 1000,
  HINT_COST: 100,
  STREAK_STEP: 0.2,
  STREAK_CAP: 2.0,
  INTERLUDE_MS: 3000,
  LEAD_MS: 250,
  ROUND_TIME_PRESETS: [10_000, 15_000, 20_000, 30_000, 60_000],
  CHAIN_MIN: 3,
  CHAIN_MAX: 20,
  CHAIN_DEFAULT: 10,
  LIVES_MIN: 1,
  LIVES_MAX: 9,
  LIVES_DEFAULT: 3,
} as const;

export const DEFAULT_SETTINGS: GameSettings = {
  chainLength: RULES.CHAIN_DEFAULT,
  roundTimeMs: 15_000,
  elimination: false,
};

// maxHints = floor(hiddenLength / 2)
const maxHintsFor = (hiddenLength: number) => Math.floor(hiddenLength / 2);

// cooldown = (roundTime − max(roundTime/3, 10s)) / maxHints   (guarantees typing buffer)
const hintCooldownFor = (roundTimeMs: number, hiddenLength: number) => {
  const maxHints = maxHintsFor(hiddenLength);
  if (maxHints <= 0) return 0;
  const buffer = Math.max(roundTimeMs / 3, 10_000);
  return Math.max(0, Math.round((roundTimeMs - buffer) / maxHints));
};

// ─── Compound-word chain (mock corpus) ───────────────────────────────────────
type Pair = { left: string; right: string; visibleSide: "left" | "right" };

const CHAIN: Pair[] = [
  { left: "class", right: "room", visibleSide: "left" },
  { left: "head", right: "master", visibleSide: "left" },
  { left: "sun", right: "flower", visibleSide: "right" },
  { left: "key", right: "board", visibleSide: "left" },
  { left: "water", right: "fall", visibleSide: "right" },
  { left: "note", right: "book", visibleSide: "left" },
  { left: "rain", right: "bow", visibleSide: "right" },
  { left: "foot", right: "ball", visibleSide: "left" },
  { left: "moon", right: "light", visibleSide: "right" },
  { left: "birth", right: "day", visibleSide: "left" },
  { left: "fire", right: "place", visibleSide: "left" },
  { left: "snow", right: "flake", visibleSide: "right" },
  { left: "book", right: "shelf", visibleSide: "left" },
  { left: "day", right: "dream", visibleSide: "right" },
  { left: "lighthouse", right: "keeper", visibleSide: "left" },
  { left: "earth", right: "quake", visibleSide: "right" },
  { left: "butter", right: "fly", visibleSide: "left" },
  { left: "news", right: "paper", visibleSide: "right" },
  { left: "play", right: "ground", visibleSide: "left" },
  { left: "thunder", right: "storm", visibleSide: "right" },
];

type RoundSpec = {
  visibleSide: "left" | "right";
  visibleWord: string;
  hiddenWord: string;
};

// non-empty array access (CHAIN is a fixed, non-empty corpus)
const at = <T>(arr: readonly T[], i: number): T => {
  const v = arr[((i % arr.length) + arr.length) % arr.length];
  if (v === undefined) throw new Error("index out of range");
  return v;
};

export const roundSpec = (index: number): RoundSpec => {
  const pair = at(CHAIN, index);
  const visibleWord = pair.visibleSide === "left" ? pair.left : pair.right;
  const hiddenWord = pair.visibleSide === "left" ? pair.right : pair.left;
  return { visibleSide: pair.visibleSide, visibleWord, hiddenWord };
};

// ─── Players ─────────────────────────────────────────────────────────────────
export const YOU_ID = "you";

const OPPONENT_NAMES = [
  "Ada",
  "Rehk",
  "3mmie",
  "Zoe",
  "Kojo",
  "Mara",
  "Tunde",
  "Priya",
  "Diego",
  "Lena",
  "Sam",
  "Ife",
  "Nova",
  "Quinn",
  "Bayo",
  "Iris",
  "Theo",
  "Wren",
  "Cleo",
  "Remi",
  "Juno",
  "Pax",
  "Esi",
];

const blankPlayer = (
  id: string,
  nickname: string,
  isHost: boolean,
  isAi: boolean,
): PublicPlayer => ({
  id,
  nickname,
  isHost,
  isAi,
  connected: true,
  score: 0,
  streak: 0,
  multiplier: 1,
  livesLeft: null,
  hintsUsedTotal: 0,
});

const makeYou = (isHost: boolean): PublicPlayer => blankPlayer(YOU_ID, "Okpa.dev", isHost, false);

export const makeOpponent = (i: number): PublicPlayer => {
  const isAi = i === 0;
  return blankPlayer(
    `p${i}`,
    isAi ? "Steady" : (OPPONENT_NAMES[i % OPPONENT_NAMES.length] ?? `Guest${i}`),
    false,
    isAi,
  );
};

export const initialRoom = (params: {
  roomCode: string;
  gameId: string;
  settings: GameSettings;
  youIsHost: boolean;
}): RoomStateMsg => {
  const you = makeYou(params.youIsHost);
  // a couple of opponents already present so the lobby/leaderboard isn't empty
  const players = params.youIsHost
    ? [you, makeOpponent(1), makeOpponent(2)]
    : // joining an existing room: someone else already hosts it
      [{ ...makeOpponent(1), isHost: true }, makeOpponent(2), makeOpponent(0), you];
  const host = players.find((p) => p.isHost) ?? you;
  return {
    type: "room_state",
    roomCode: params.roomCode,
    gameId: params.gameId,
    mode: "group",
    status: "waiting",
    host: { id: host.id, nickname: host.nickname },
    settings: params.settings,
    players,
    currentRoundIndex: null,
    totalRounds: params.settings.chainLength,
  };
};

// ─── Pure message builders ───────────────────────────────────────────────────
export const buildRoundStart = (params: {
  roundIndex: number;
  settings: GameSettings;
  you: PublicPlayer;
  now: number;
}): RoundStartMsg => {
  const spec = roundSpec(params.roundIndex);
  const hiddenLength = spec.hiddenWord.length;
  const roundStartsAt = params.now + RULES.LEAD_MS;
  return {
    type: "round_start",
    roundIndex: params.roundIndex,
    visibleSide: spec.visibleSide,
    visibleWord: spec.visibleWord.toUpperCase(),
    hiddenLength,
    hiddenFirstChar: spec.hiddenWord[0]?.toUpperCase() ?? "",
    roundStartsAt,
    roundEndsAt: roundStartsAt + params.settings.roundTimeMs,
    maxHints: maxHintsFor(hiddenLength),
    hintCooldownMs: hintCooldownFor(params.settings.roundTimeMs, hiddenLength),
    yourState: {
      points: params.you.score,
      streak: params.you.streak,
      multiplier: params.you.multiplier,
      livesLeft: params.you.livesLeft,
    },
  };
};

// speed_weight = 1 − (effMs / roundMs)^1.5  (clamped)
const speedWeight = (elapsedMs: number, roundMs: number) => {
  const ratio = Math.max(0, Math.min(1, elapsedMs / roundMs));
  return Math.max(0.02, 1 - ratio ** 1.5);
};

export const computeRoundScore = (elapsedMs: number, roundMs: number, multiplier: number) =>
  Math.round(RULES.BASE_POINTS * speedWeight(elapsedMs, roundMs) * multiplier);

export const nextMultiplier = (current: number) =>
  Math.min(RULES.STREAK_CAP, Math.round((current + RULES.STREAK_STEP) * 10) / 10);

export const buildGameOver = (gameId: string, players: PublicPlayer[]): GameOverMsg => {
  const ranked = [...players].sort((a, b) => b.score - a.score);
  return {
    type: "game_over",
    gameId,
    outcome: "completed",
    standings: ranked.map((p, i) => ({
      playerId: p.id,
      nickname: p.nickname,
      isAi: p.isAi,
      placement: i + 1,
      finalScore: p.score,
    })),
  };
};

export const buildRoundEnd = (params: {
  roundIndex: number;
  hiddenWord: string;
  players: PublicPlayer[];
  perRound: Map<
    string,
    {
      correct: boolean;
      locked: boolean;
      lockedAt: number | null;
      roundScore: number;
      hintsUsed: number;
    }
  >;
  nextRoundStartsAt: number | null;
}): RoundEndMsg => ({
  type: "round_end",
  roundIndex: params.roundIndex,
  answer: params.hiddenWord.toUpperCase(),
  perPlayer: params.players.map((p) => {
    const r = params.perRound.get(p.id);
    return {
      playerId: p.id,
      correct: r?.correct ?? false,
      locked: r?.locked ?? false,
      lockedAt: r?.lockedAt ?? null,
      roundScore: r?.roundScore ?? 0,
      totalScore: p.score,
      streak: p.streak,
      multiplier: p.multiplier,
      hintsUsed: r?.hintsUsed ?? 0,
      livesLeft: p.livesLeft,
    };
  }),
  nextRoundStartsAt: params.nextRoundStartsAt,
});
