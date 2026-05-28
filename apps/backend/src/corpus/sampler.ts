import { db } from "../db";
import type { FreqTier } from "./types";

export type TierWeights = Record<FreqTier, number>;

const DEFAULT_WEIGHTS: TierWeights = { common: 0.5, normal: 0.35, rare: 0.15 };

// Returns `count` distinct validated pair IDs. Distribution across tiers
// follows the provided weights. Falls back to whatever tiers are available
// when a tier is empty.
export function sampleRoundQueue(count: number, opts: { weights?: TierWeights } = {}): string[] {
  const weights = opts.weights ?? DEFAULT_WEIGHTS;
  const tiers: FreqTier[] = ["common", "normal", "rare"];

  const byTier: Record<FreqTier, string[]> = { common: [], normal: [], rare: [] };
  for (const tier of tiers) {
    const rows = db
      .query<{ id: string }, [string]>(
        "SELECT id FROM pairs WHERE validated = 1 AND freq_tier = ? ORDER BY RANDOM()",
      )
      .all(tier);
    byTier[tier] = rows.map((r) => r.id);
  }

  const total = byTier.common.length + byTier.normal.length + byTier.rare.length;
  if (total < count) {
    throw new Error(`sampleRoundQueue: requested ${count} but only ${total} validated pairs exist`);
  }

  const targets: Record<FreqTier, number> = {
    common: Math.round(count * weights.common),
    normal: Math.round(count * weights.normal),
    rare: Math.round(count * weights.rare),
  };
  // Rounding drift correction
  const drift = count - (targets.common + targets.normal + targets.rare);
  targets.common += drift;

  const picked: string[] = [];
  for (const tier of tiers) {
    const take = Math.min(targets[tier], byTier[tier].length);
    picked.push(...byTier[tier].splice(0, take));
  }

  // Top up from remaining pool if a tier was empty
  if (picked.length < count) {
    const remainder = [...byTier.common, ...byTier.normal, ...byTier.rare];
    picked.push(...remainder.slice(0, count - picked.length));
  }

  return picked;
}
