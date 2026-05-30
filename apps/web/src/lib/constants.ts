import type { GameSettings } from "@repo/shared";

// Backend-mirrored limits for the create-room form (apps/backend room validation).
export const RULES = {
  ROUND_TIME_PRESETS: [10_000, 15_000, 20_000, 30_000, 60_000],
  CHAIN_MIN: 3,
  CHAIN_MAX: 20,
  CHAIN_DEFAULT: 10,
  LIVES_MIN: 1,
  LIVES_MAX: 9,
  LIVES_DEFAULT: 3,
} as const;

// Fallback used only to seed the lobby UI before the first room_state arrives
// (e.g. cold reconnect into an in-progress room). The server is authoritative.
export const DEFAULT_SETTINGS: GameSettings = {
  chainLength: RULES.CHAIN_DEFAULT,
  roundTimeMs: 15_000,
  elimination: false,
};
