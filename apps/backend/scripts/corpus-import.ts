#!/usr/bin/env bun
// Reads apps/backend/data/seed-candidates.json, runs each candidate through
// the frequency gate, inserts every candidate into pair_review_queue, and
// promotes passing rows into words+pairs with generated variants.
//
// Idempotent: re-running on the same JSON inserts no duplicates.
//
// Usage: bun run corpus:import

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { freqGate } from "../src/corpus/freq-gate";
import type { Candidate, FreqResult } from "../src/corpus/types";
import { generateVariants } from "../src/corpus/variants";
import { db } from "../src/db";
import { migrate } from "../src/db/migrate";
import { newId } from "../src/lib/ids";

const SEED_PATH = join(import.meta.dir, "..", "data", "seed-candidates.json");
const CONCURRENCY = 5;

type ImportStats = {
  total: number;
  inserted: number;
  promoted: number;
  rejected: number;
  skipped: number;
};

function loadCandidates(): Candidate[] {
  if (!existsSync(SEED_PATH)) {
    throw new Error(`No seed file at ${SEED_PATH}. Run corpus:generate first.`);
  }
  return JSON.parse(readFileSync(SEED_PATH, "utf8")) as Candidate[];
}

function getOrCreateWordId(text: string, now: number): string {
  const canonical = text.toLowerCase().trim();
  const existing = db
    .query<{ id: string }, [string]>("SELECT id FROM words WHERE text = ?")
    .get(canonical);
  if (existing) return existing.id;
  const id = newId();
  db.run("INSERT INTO words (id, text, created_at) VALUES (?, ?, ?)", [id, canonical, now]);
  return id;
}

function pairExists(wordAId: string, wordBId: string): boolean {
  const row = db
    .query<{ id: string }, [string, string]>(
      "SELECT id FROM pairs WHERE word_a_id = ? AND word_b_id = ?",
    )
    .get(wordAId, wordBId);
  return row !== null;
}

function queueRowFor(a: string, b: string): { id: string; status: string } | null {
  return db
    .query<{ id: string; status: string }, [string, string]>(
      "SELECT id, status FROM pair_review_queue WHERE LOWER(word_a) = ? AND LOWER(word_b) = ?",
    )
    .get(a.toLowerCase().trim(), b.toLowerCase().trim());
}

async function gateAll(candidates: Candidate[]): Promise<Map<number, FreqResult>> {
  const results = new Map<number, FreqResult>();
  let cursor = 0;
  const workers = Array.from({ length: CONCURRENCY }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= candidates.length) return;
      const c = candidates[idx];
      if (!c) return;
      process.stdout.write(`  ${idx + 1}/${candidates.length} ${c.a} ${c.b}…`);
      const result = await freqGate(c.a, c.b);
      results.set(idx, result);
      console.log(` tier=${result.tier ?? "reject"} score=${result.score}`);
    }
  });
  await Promise.all(workers);
  return results;
}

async function main(): Promise<void> {
  migrate();
  const candidates = loadCandidates();
  console.log(`Loaded ${candidates.length} candidates from ${SEED_PATH}.`);
  console.log("Running freq-gate…");
  const gateResults = await gateAll(candidates);

  const stats: ImportStats = {
    total: candidates.length,
    inserted: 0,
    promoted: 0,
    rejected: 0,
    skipped: 0,
  };
  const now = Date.now();

  const tx = db.transaction(() => {
    for (let i = 0; i < candidates.length; i++) {
      const c = candidates[i];
      const gate = gateResults.get(i);
      if (!c || !gate) continue;

      const existingQueue = queueRowFor(c.a, c.b);
      const status = gate.tier ? "approved" : "rejected";

      if (existingQueue) {
        stats.skipped++;
      } else {
        db.run(
          `INSERT INTO pair_review_queue
            (id, word_a, word_b, claimed_meta, status, freq_signal, reject_reason, created_at, processed_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            newId(),
            c.a,
            c.b,
            JSON.stringify({ category: c.category, example_usage: c.example_usage }),
            status,
            JSON.stringify(gate),
            gate.tier ? null : "freq_gate_score_zero",
            now,
            now,
          ],
        );
        stats.inserted++;
      }

      if (!gate.tier) {
        stats.rejected++;
        continue;
      }

      const wordAId = getOrCreateWordId(c.a, now);
      const wordBId = getOrCreateWordId(c.b, now);
      if (pairExists(wordAId, wordBId)) continue;

      db.run(
        `INSERT INTO pairs
          (id, word_a_id, word_b_id, variants_a, variants_b, freq_tier, source, validated, created_at)
         VALUES (?, ?, ?, ?, ?, ?, 'ai', 1, ?)`,
        [
          newId(),
          wordAId,
          wordBId,
          JSON.stringify(generateVariants(c.a)),
          JSON.stringify(generateVariants(c.b)),
          gate.tier,
          now,
        ],
      );
      stats.promoted++;
    }
  });
  tx();

  const totalPairs = db
    .query<{ n: number }, []>("SELECT COUNT(*) as n FROM pairs WHERE validated = 1")
    .get();
  console.log("\nImport complete:");
  console.log(`  candidates total:        ${stats.total}`);
  console.log(`  queue rows inserted:     ${stats.inserted}`);
  console.log(`  promoted to pairs:       ${stats.promoted}`);
  console.log(`  rejected (score=0):      ${stats.rejected}`);
  console.log(`  duplicates skipped:      ${stats.skipped}`);
  console.log(`  validated pairs in DB:   ${totalPairs?.n ?? 0}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
