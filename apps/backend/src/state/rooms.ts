import type { GameMode, GameSettings, RoomStatus } from "@repo/shared";
import type { Mutex } from "../lib/mutex";

export type RoundState = {
  roundIndex: number;
  pairId: string;
  visibleSide: "left" | "right";
  visibleWord: string;
  hiddenWord: string;
  hiddenVariants: string[];
  roundStartsAt: number;
  roundEndsAt: number;
  endTimer: ReturnType<typeof setTimeout> | null;
  nextTimer: ReturnType<typeof setTimeout> | null;
  perPlayer: Map<string, RoundPlayerState>;
  roundStartSent: Set<string>;
};

export type FinishedRoundRecord = {
  roundIndex: number;
  pairId: string;
  hiddenSide: "left" | "right";
  outcomes: Array<{
    playerId: string;
    correct: boolean;
    lockedAt: number | null;
    roundScore: number;
    hintsUsed: number;
  }>;
};

export type RoundPlayerState = {
  locked: boolean;
  correct: boolean;
  lockedAt: number | null;
  roundScore: number;
  revealedIndexes: number[];
  hintsUsed: number;
  hintCooldownUntil: number;
  streakBrokenThisRound: boolean;
};

export type PlayerState = {
  id: string;
  nickname: string;
  isAi: boolean;
  aiPersona: string | null;
  score: number;
  streak: number;
  multiplier: number;
  livesLeft: number | null;
  hintsUsedTotal: number;
  eliminatedAt: number | null;
  disconnected: boolean;
};

export type Room = {
  code: string;
  gameId: string;
  hostId: string;
  mode: GameMode;
  status: RoomStatus;
  settings: GameSettings;
  players: Map<string, PlayerState>;
  roundQueue: string[];
  finishedRounds: FinishedRoundRecord[];
  currentRound: RoundState | null;
  startedAt: number | null;
  createdAt: number;
  mutex: Mutex;
};

export const rooms = new Map<string, Room>();

export function isCodeInUse(code: string): boolean {
  return rooms.has(code);
}

export function findHostedRoom(userId: string): Room | null {
  for (const r of rooms.values()) {
    if (r.hostId === userId && r.status !== "finished") return r;
  }
  return null;
}

export function maxPlayersFor(mode: GameMode): number {
  if (mode === "solo") return 1;
  if (mode === "dual") return 2;
  return 8;
}

export function minPlayersFor(mode: GameMode): number {
  if (mode === "solo") return 1;
  if (mode === "dual") return 2;
  return 2;
}
