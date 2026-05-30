import type {
  GameMode,
  GameOverMsg,
  GameSettings,
  PublicPlayer,
  RoomStateMsg,
  RoundEndMsg,
  RoundStartMsg,
} from "@repo/shared";

export type FeedEntry = {
  id: string;
  playerId: string;
  nickname: string;
  isYou: boolean;
  roundScore: number;
};

export type RoundHistory = { index: number; compound: string; youCorrect: boolean };

// Your local round input + server-confirmed reveals (server is authoritative for
// correctness/score — we never compute them client-side).
export type YouRound = {
  typed: string;
  nearMiss: boolean;
  hints: Array<{ index: number; char: string }>;
  hintsUsed: number;
  cooldownUntil: number | null;
  hintError: string | null;
  lock: { correct: boolean; roundScore: number } | null;
};

export type RoundView = {
  index: number;
  start: RoundStartMsg;
  lockedIds: string[];
  you: YouRound;
};

export type GameStatus = "lobby" | "playing" | "interlude" | "over";

export type GameState = {
  status: GameStatus;
  youId: string;
  room: RoomStateMsg;
  round: RoundView | null;
  roundEnd: RoundEndMsg | null;
  gameOver: GameOverMsg | null;
  feed: FeedEntry[];
  history: RoundHistory[];
  eliminated: boolean;
  connected: boolean;
};

export type InitArgs = {
  youId: string;
  nickname: string;
  roomCode: string;
  gameId: string;
  mode: GameMode;
  settings: GameSettings;
};

export const selectYou = (s: GameState): PublicPlayer => {
  const you = s.room.players.find((p) => p.id === s.youId) ?? s.room.players[0];
  if (!you) throw new Error("no players in room");
  return you;
};

export const selectLeaderboard = (s: GameState): PublicPlayer[] =>
  [...s.room.players].sort((a, b) => b.score - a.score);
