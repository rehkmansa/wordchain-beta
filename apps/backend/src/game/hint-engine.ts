import { ERROR_CODES, type ErrorCode } from "@repo/shared";
import type { Room } from "../state/rooms";
import { hintCost } from "./scoring";

type HintResult =
  | {
      ok: true;
      index: number;
      char: string;
      hintsUsedNow: number;
      pointsRemaining: number;
      cooldownExpiresAt: number;
      cooldownMs: number;
    }
  | { ok: false; code: ErrorCode };

// Caller must hold the room mutex.
export function applyHint(room: Room, userId: string, now: number): HintResult {
  const round = room.currentRound;
  if (!round) return { ok: false, code: ERROR_CODES.ROUND_NOT_OPEN };

  const player = room.players.get(userId);
  if (!player) return { ok: false, code: ERROR_CODES.ROOM_NOT_FOUND };

  const state = round.perPlayer.get(userId);
  if (!state) return { ok: false, code: ERROR_CODES.ROUND_NOT_OPEN };
  if (state.locked) return { ok: false, code: ERROR_CODES.ALREADY_LOCKED };
  if (now < state.hintCooldownUntil) return { ok: false, code: ERROR_CODES.HINT_COOLDOWN };

  const hidden = round.hiddenWord;
  const revealed = new Set(state.revealedIndexes);
  const maxHintsForRound = Math.floor(hidden.length / 2);
  if (state.hintsUsed >= maxHintsForRound) return { ok: false, code: ERROR_CODES.HINTS_EXHAUSTED };

  let nextIdx = -1;
  for (let i = 0; i < hidden.length; i++) {
    if (!revealed.has(i)) {
      nextIdx = i;
      break;
    }
  }
  if (nextIdx === -1) return { ok: false, code: ERROR_CODES.HINTS_EXHAUSTED };

  const cost = hintCost();
  if (player.score < cost) return { ok: false, code: ERROR_CODES.INSUFFICIENT_POINTS };

  player.score -= cost;
  state.hintsUsed += 1;
  state.revealedIndexes.push(nextIdx);
  player.hintsUsedTotal += 1;

  // First hint of round breaks the streak immediately (rule per DESIGN.md).
  if (!state.streakBrokenThisRound) {
    state.streakBrokenThisRound = true;
    player.streak = 0;
    player.multiplier = 1;
  }

  const buffer = Math.max(room.settings.roundTimeMs / 3, 10_000);
  const cooldownMs =
    maxHintsForRound > 0 ? Math.max(0, (room.settings.roundTimeMs - buffer) / maxHintsForRound) : 0;
  state.hintCooldownUntil = now + cooldownMs;

  const char = hidden[nextIdx] ?? "";
  return {
    ok: true,
    index: nextIdx,
    char,
    hintsUsedNow: state.hintsUsed,
    pointsRemaining: player.score,
    cooldownExpiresAt: state.hintCooldownUntil,
    cooldownMs,
  };
}
