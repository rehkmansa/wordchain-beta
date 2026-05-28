import { levenshtein } from "./edit-distance";
import { normalizeAnswer } from "./normalize";

type ValidationResult = { kind: "correct" } | { kind: "wrong" } | { kind: "near_miss" };

const NEAR_MISS_MIN_HIDDEN_LEN = 5;
const NEAR_MISS_DISTANCE = 1;

export function validateAnswer(
  rawInput: string,
  canonical: string,
  variants: string[],
): ValidationResult {
  const input = normalizeAnswer(rawInput);
  if (!input) return { kind: "wrong" };

  const targets = [normalizeAnswer(canonical), ...variants.map(normalizeAnswer)];

  for (const t of targets) {
    if (input === t) return { kind: "correct" };
  }

  // Edit-distance grace: only if hidden side is long enough and first letter matches.
  if (canonical.length < NEAR_MISS_MIN_HIDDEN_LEN) return { kind: "wrong" };

  for (const t of targets) {
    if (!t || t[0] !== input[0]) continue;
    if (levenshtein(input, t, NEAR_MISS_DISTANCE) <= NEAR_MISS_DISTANCE) {
      return { kind: "near_miss" };
    }
  }
  return { kind: "wrong" };
}
