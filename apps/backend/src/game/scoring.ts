import type { GameSettings } from "@repo/shared";

const BASE_POINTS = 1000;
const SPEED_CURVE_P = 1.5;
const STREAK_INCREMENT = 0.2;
const STREAK_CAP_MULTIPLIER = 2;

function speedWeight(effectiveMs: number, roundMs: number): number {
  if (effectiveMs <= 0) return 1;
  if (effectiveMs >= roundMs) return 0;
  const ratio = effectiveMs / roundMs;
  return Math.max(0, 1 - ratio ** SPEED_CURVE_P);
}

export function nextMultiplierAfterCleanSolve(current: number): number {
  return Math.min(STREAK_CAP_MULTIPLIER, +(current + STREAK_INCREMENT).toFixed(4));
}

export function roundScore(effectiveMs: number, roundMs: number, streakMultiplier: number): number {
  const weight = speedWeight(effectiveMs, roundMs);
  return Math.round(BASE_POINTS * weight * streakMultiplier);
}

export function hintCost(): number {
  return Math.round(BASE_POINTS * 0.1);
}

export function maxHintsFor(hiddenLength: number): number {
  return Math.max(0, Math.floor(hiddenLength / 2));
}

export function hintCooldownMs(settings: GameSettings, maxHints: number): number {
  if (maxHints <= 0) return 0;
  const buffer = Math.max(settings.roundTimeMs / 3, 10_000);
  return Math.max(0, (settings.roundTimeMs - buffer) / maxHints);
}
