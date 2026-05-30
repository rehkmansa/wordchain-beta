// Shared types between backend and web. Authoritative protocol surface.

export type GameMode = "solo" | "dual" | "group";
export type RoomStatus = "waiting" | "playing" | "finished";
export type AccountType = "anon" | "regular" | "pro";
export type AiPersona = "steady";
export type AiDifficulty = "easy" | "normal" | "hard";

export type GameSettings = {
  chainLength: number;
  roundTimeMs: number;
  elimination: boolean;
  lives?: number;
  aiDifficulty?: AiDifficulty;
};

export type PublicPlayer = {
  id: string;
  nickname: string;
  isHost: boolean;
  isAi: boolean;
  connected: boolean;
  score: number;
  streak: number;
  multiplier: number;
  livesLeft: number | null;
  hintsUsedTotal: number;
};

// ─── Server → Client messages ────────────────────────────────────────────

export type RoomStateMsg = {
  type: "room_state";
  roomCode: string;
  gameId: string;
  mode: GameMode;
  status: RoomStatus;
  host: { id: string; nickname: string };
  settings: GameSettings;
  players: PublicPlayer[];
  currentRoundIndex: number | null;
  totalRounds: number;
};

export type TimeSyncMsg = {
  type: "time_sync";
  serverTime: number;
  pingId: string;
};

export type RoundStartMsg = {
  type: "round_start";
  roundIndex: number;
  visibleSide: "left" | "right";
  visibleWord: string;
  hiddenLength: number;
  hiddenFirstChar: string;
  roundStartsAt: number;
  roundEndsAt: number;
  maxHints: number;
  hintCooldownMs: number;
  yourState: {
    points: number;
    streak: number;
    multiplier: number;
    livesLeft: number | null;
  };
};

export type HintRevealedMsg = {
  type: "hint_revealed";
  roundIndex: number;
  index: number;
  char: string;
  hintsUsedNow: number;
  pointsRemaining: number;
  cooldownExpiresAt: number;
};

export type AnswerResultMsg = {
  type: "answer_result";
  roundIndex: number;
  correct: boolean;
  lockedAt: number;
  roundScore: number;
  newAccumulated: number;
  newStreak: number;
  newMultiplier: number;
};

export type PlayerLockedMsg = {
  type: "player_locked";
  roundIndex: number;
  playerId: string;
};

export type AiEventMsg = {
  type: "ai_event";
  event: "thinking" | "used_hint" | "locked";
  roundIndex: number;
};

export type RoundEndMsg = {
  type: "round_end";
  roundIndex: number;
  answer: string;
  perPlayer: Array<{
    playerId: string;
    correct: boolean;
    locked: boolean;
    lockedAt: number | null;
    roundScore: number;
    totalScore: number;
    streak: number;
    multiplier: number;
    hintsUsed: number;
    livesLeft: number | null;
  }>;
  nextRoundStartsAt: number | null;
};

export type GameOverMsg = {
  type: "game_over";
  gameId: string;
  outcome: "completed" | "abandoned";
  standings: Array<{
    playerId: string;
    nickname: string;
    isAi: boolean;
    placement: number;
    finalScore: number;
  }>;
};

export type ErrorMsg = {
  type: "error";
  code: string;
  message: string;
  context?: Record<string, unknown>;
};

export type ServerMessage =
  | RoomStateMsg
  | TimeSyncMsg
  | RoundStartMsg
  | HintRevealedMsg
  | AnswerResultMsg
  | PlayerLockedMsg
  | AiEventMsg
  | RoundEndMsg
  | GameOverMsg
  | ErrorMsg;

// ─── Client → Server messages ────────────────────────────────────────────

export type TimeSyncAckMsg = {
  type: "time_sync_ack";
  pingId: string;
  clientReceivedAt: number;
  clientSendingAt: number;
};

export type JoinRoomMsg = {
  type: "join_room";
  roomCode: string;
};

export type StartGameMsg = { type: "start_game" };

export type SubmitAnswerMsg = {
  type: "submit_answer";
  roundIndex: number;
  answer: string;
};

export type RequestHintMsg = {
  type: "request_hint";
  roundIndex: number;
};

export type LeaveRoomMsg = { type: "leave_room" };

export type SetNicknameMsg = { type: "set_nickname"; nickname: string };

export type ClientMessage =
  | TimeSyncAckMsg
  | JoinRoomMsg
  | StartGameMsg
  | SubmitAnswerMsg
  | RequestHintMsg
  | LeaveRoomMsg
  | SetNicknameMsg;

// ─── Error codes ─────────────────────────────────────────────────────────

export const ERROR_CODES = {
  UNAUTHENTICATED: "UNAUTHENTICATED",
  ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
  ROOM_LOCKED: "ROOM_LOCKED",
  ROOM_FULL: "ROOM_FULL",
  GAME_ID_MISMATCH: "GAME_ID_MISMATCH",
  INVALID_SETTINGS: "INVALID_SETTINGS",
  TOO_MANY_ROOMS: "TOO_MANY_ROOMS",
  NOT_HOST: "NOT_HOST",
  WRONG_ROUND: "WRONG_ROUND",
  ROUND_NOT_OPEN: "ROUND_NOT_OPEN",
  ALREADY_LOCKED: "ALREADY_LOCKED",
  EDIT_DISTANCE_RETRY: "EDIT_DISTANCE_RETRY",
  HINT_COOLDOWN: "HINT_COOLDOWN",
  HINTS_EXHAUSTED: "HINTS_EXHAUSTED",
  INSUFFICIENT_POINTS: "INSUFFICIENT_POINTS",
  RATE_LIMITED: "RATE_LIMITED",
  INTERNAL: "INTERNAL",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── REST shapes ─────────────────────────────────────────────────────────

export type CreateRoomRequest = {
  mode: GameMode;
  settings: GameSettings;
};

export type CreateRoomResponse = {
  roomCode: string;
  gameId: string;
  wsUrl: string;
};

export type GetRoomResponse = {
  roomCode: string;
  gameId: string;
  mode: GameMode;
  status: "waiting" | "playing";
  playerCount: number;
  maxPlayers: number;
  settings: GameSettings;
};
