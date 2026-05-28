#!/usr/bin/env bun
// Generates word-pair candidates via OpenAI and appends them to
// apps/backend/data/seed-candidates.json. The output file is checked into
// the repo — this script is run by humans only.
//
// Usage: bun run corpus:generate -- --count 30

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import OpenAI from "openai";
import type { Candidate } from "../src/corpus/types";

const OUT_PATH = join(import.meta.dir, "..", "data", "seed-candidates.json");
const MODEL = "gpt-4o-mini";

const CATEGORIES = [
  "compound nouns (e.g. 'fire truck', 'rain coat')",
  "famous fictional character names (e.g. 'Master Chief', 'Harry Potter')",
  "well-known brands or products (e.g. 'Hot Wheels', 'Big Mac')",
  "food and dishes (e.g. 'apple pie', 'fried rice')",
  "places and landmarks (e.g. 'Times Square', 'Niagara Falls')",
  "common idioms or phrases (e.g. 'dark horse', 'silver lining')",
  "movie/show titles (e.g. 'Breaking Bad', 'Star Wars')",
  "sports terms (e.g. 'home run', 'free throw')",
];

function parseArgs(): { count: number } {
  const args = process.argv.slice(2);
  const i = args.indexOf("--count");
  const count = i >= 0 && args[i + 1] ? Number(args[i + 1]) : 30;
  if (!Number.isFinite(count) || count <= 0) {
    throw new Error(`Invalid --count value: ${args[i + 1]}`);
  }
  return { count };
}

function loadExisting(): Candidate[] {
  if (!existsSync(OUT_PATH)) return [];
  return JSON.parse(readFileSync(OUT_PATH, "utf8")) as Candidate[];
}

function dedupeKey(c: Pick<Candidate, "a" | "b">): string {
  return `${c.a.toLowerCase().trim()}|${c.b.toLowerCase().trim()}`;
}

async function generateBatch(client: OpenAI, count: number): Promise<Candidate[]> {
  const categoryList = CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join("\n");
  const prompt = `Generate ${count} two-word phrases for a word-chain guessing game. The player will see one word and must guess the other.

Vary across these categories — aim for roughly even distribution:
${categoryList}

Rules:
- Each phrase is exactly two words (a, b). Order matters: "Master Chief" is different from "Chief Master".
- Both words should be common enough that a typical adult would recognize the full phrase.
- Avoid offensive content, slurs, or anything not work-safe.
- Avoid pairs where either word is rare on its own (e.g. "Quetzalcoatl Statue").
- Avoid trademarked phrases that aren't widely recognized.
- Use Title Case for proper nouns; lowercase for common nouns.
- Provide a brief category label and a short example_usage sentence.`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          "You are a precise word-pair generator. Output only valid JSON matching the schema.",
      },
      { role: "user", content: prompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "candidates",
        strict: true,
        schema: {
          type: "object",
          properties: {
            pairs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  a: { type: "string" },
                  b: { type: "string" },
                  category: { type: "string" },
                  example_usage: { type: "string" },
                },
                required: ["a", "b", "category", "example_usage"],
                additionalProperties: false,
              },
            },
          },
          required: ["pairs"],
          additionalProperties: false,
        },
      },
    },
  });

  const text = completion.choices[0]?.message.content;
  if (!text) throw new Error("OpenAI returned empty content");
  const parsed = JSON.parse(text) as { pairs: Candidate[] };
  return parsed.pairs;
}

async function main(): Promise<void> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY env var is required");

  const { count } = parseArgs();
  const client = new OpenAI({ apiKey });

  console.log(`Generating ~${count} candidates via ${MODEL}…`);
  const fresh = await generateBatch(client, count);
  console.log(`Got ${fresh.length} candidates back.`);

  const existing = loadExisting();
  const seen = new Set(existing.map(dedupeKey));
  const additions = fresh.filter((c) => !seen.has(dedupeKey(c)));
  const merged = [...existing, ...additions];

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, `${JSON.stringify(merged, null, 2)}\n`);

  console.log(
    `Wrote ${OUT_PATH}: +${additions.length} new, ${fresh.length - additions.length} duplicates skipped, ${merged.length} total.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
