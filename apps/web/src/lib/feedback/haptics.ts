import { isMuted } from "~/lib/audio/sfx";
import { subscribeFeedback } from "./bus";
import type { FeedbackEvent } from "./events";

// Vibration patterns (ms on/off). Tied to the same mute toggle as sound — one
// switch silences all feedback.
const PATTERNS: Partial<Record<FeedbackEvent["kind"], number | number[]>> = {
  correct: 12,
  wrong: 45,
  streakUp: [0, 18, 40, 18],
  streakMax: [0, 25, 30, 25, 30, 60],
  streakBreak: [0, 70],
  win: [0, 40, 60, 40, 60, 90],
  lose: 130,
};

const buzz = (pattern: number | number[]): void => {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // unsupported / blocked — ignore
  }
};

subscribeFeedback((e) => {
  if (isMuted()) return;
  const pattern = PATTERNS[e.kind];
  if (pattern !== undefined) buzz(pattern);
});
