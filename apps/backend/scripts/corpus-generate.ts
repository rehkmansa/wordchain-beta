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
// OpenAI is unreliable returning huge arrays in one shot, so we request the
// target total in batches of this size and merge+dedupe across them.
const BATCH_SIZE = 25;
// How many batches run concurrently. Each is one cheap gpt-4o-mini call.
const GEN_CONCURRENCY = 8;
// Flush partial progress to disk every this many completed batches so a long
// run can be killed/resumed without losing work.
const CHECKPOINT_EVERY = 8;

const CATEGORIES = [
  "compound nouns (e.g. 'fire truck', 'rain coat')",
  "famous fictional character names (e.g. 'Master Chief', 'Harry Potter')",
  "well-known brands or products (e.g. 'Hot Wheels', 'Big Mac')",
  "food and dishes (e.g. 'apple pie', 'fried rice')",
  "places and landmarks (e.g. 'Times Square', 'Niagara Falls')",
  "common idioms or phrases (e.g. 'dark horse', 'silver lining')",
  "movie/show titles (e.g. 'Breaking Bad', 'Star Wars')",
  "sports terms (e.g. 'home run', 'free throw')",
  "science and nature (e.g. 'black hole', 'coral reef')",
  "history and mythology (e.g. 'Trojan Horse', 'Cold War')",
  "music and bands (e.g. 'Pink Floyd', 'jazz hands')",
  "tools, machines and vehicles (e.g. 'jet engine', 'power drill')",
  "geography and weather (e.g. 'monsoon season', 'tide pool')",
  "occupations and titles (e.g. 'prime minister', 'flight attendant')",
  "games and hobbies (e.g. 'chess board', 'comic book')",
  "two-word animals and plants (e.g. 'polar bear', 'venus flytrap')",
  "body and medicine (e.g. 'blood pressure', 'rib cage')",
  "clothing and fashion (e.g. 'tank top', 'high heels')",
  "household objects and furniture (e.g. 'coffee table', 'door knob')",
  "kitchen and cooking (e.g. 'cutting board', 'oven mitt')",
  "colors and materials (e.g. 'rose gold', 'stained glass')",
  "two-word adjective+noun descriptions (e.g. 'wild card', 'blank slate')",
  "verb+noun action phrases (e.g. 'jump rope', 'pinch hit')",
  "weather and disasters (e.g. 'flash flood', 'heat wave')",
  "space and astronomy (e.g. 'shooting star', 'red giant')",
  "money and business (e.g. 'stock market', 'piggy bank')",
  "law, crime and military (e.g. 'court martial', 'crime scene')",
  "school and academia (e.g. 'report card', 'study hall')",
  "technology and computing (e.g. 'hard drive', 'search engine')",
  "transportation and travel (e.g. 'boarding pass', 'roller coaster')",
  "famous duos and partners (e.g. 'Tom Jerry', 'Bonnie Clyde')",
  "video games and franchises (e.g. 'Donkey Kong', 'Final Fantasy')",
  "superheroes and villains (e.g. 'Iron Man', 'Lex Luthor')",
  "mythical creatures (e.g. 'sea serpent', 'fire dragon')",
  "card and board games (e.g. 'go fish', 'tic tac')",
  "music genres and instruments (e.g. 'bass guitar', 'folk rock')",
  "art and literature (e.g. 'still life', 'graphic novel')",
  "two-word holidays and events (e.g. 'New Year', 'Black Friday')",
  "nature features and landforms (e.g. 'sand dune', 'rain forest')",
  "gems, minerals and rocks (e.g. 'fool's gold', 'lava rock')",
  "drinks and beverages (e.g. 'iced tea', 'root beer')",
  "famous landmarks worldwide (e.g. 'Big Ben', 'Machu Picchu')",
  "US states/cities + noun (e.g. 'Texas toast', 'French fries')",
  "common two-word phrases people say (e.g. 'small talk', 'cold feet')",
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

// Fisher–Yates with a per-batch seed so each batch sees categories in a
// different order — keeps the model from anchoring on the same few examples.
function shuffled<T>(items: readonly T[], seed: number): T[] {
  const out = [...items];
  let state = seed >>> 0;
  for (let i = out.length - 1; i > 0; i--) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [out[i], out[j]] = [out[j] as T, out[i] as T];
  }
  return out;
}

function loadExisting(): Candidate[] {
  if (!existsSync(OUT_PATH)) return [];
  return JSON.parse(readFileSync(OUT_PATH, "utf8")) as Candidate[];
}

function dedupeKey(c: Pick<Candidate, "a" | "b">): string {
  return `${c.a.toLowerCase().trim()}|${c.b.toLowerCase().trim()}`;
}

// The game shows one word and asks for the other, so each side must be a single
// token. At higher temperatures the model loves to emit 3+ word "phrases"
// (e.g. a="Peanut Butter", b="Jelly") — those can't form a real two-word pair
// and the freq-gate rejects ~all of them, tanking yield. Drop them up front.
function isSingleTokenPair(c: Pick<Candidate, "a" | "b">): boolean {
  const ok = (w: string) => {
    const t = w.trim();
    return t.length > 0 && !/[\s]/.test(t);
  };
  return ok(c.a) && ok(c.b);
}

async function generateBatch(
  client: OpenAI,
  count: number,
  batchIndex: number,
  avoid: string[],
): Promise<Candidate[]> {
  const categoryList = shuffled(CATEGORIES, batchIndex + 1)
    .map((c, i) => `${i + 1}. ${c}`)
    .join("\n");
  const avoidList = avoid.length
    ? `\n\nDo NOT repeat any of these already-used phrases:\n${avoid.slice(-400).join(", ")}`
    : "";
  const prompt = `Generate ${count} two-word phrases for a word-chain guessing game. The player will see one word and must guess the other.

Vary across these categories — aim for roughly even distribution:
${categoryList}

Rules:
- A phrase is exactly TWO words. "a" is the first word, "b" is the second. Each of a and b is a SINGLE word with NO spaces (e.g. a="fire", b="truck"). NEVER put two words in one field.
- The two words together must form a REAL, widely-recognized phrase or compound — something a well-read adult would know (e.g. "polar bear", "black hole", "Harry Potter", "apple pie"). If the pair isn't a real established phrase, don't include it.
- Both words must be real dictionary words or proper nouns — no made-up or misspelled words.
- Prefer interesting, less clichéd pairings over the most obvious ones, but REAL beats clever — never invent a phrase just to be surprising.
- Order matters: "Master Chief" is different from "Chief Master".
- Avoid offensive content, slurs, or anything not work-safe.
- Avoid pairs where either word is obscure on its own (e.g. "Quetzalcoatl Statue").
- Use Title Case for proper nouns; lowercase for common nouns.
- Maximize variety: do not cluster around one theme.
- Provide a brief category label and a short example_usage sentence.${avoidList}`;

  const completion = await client.chat.completions.create({
    model: MODEL,
    temperature: 0.85,
    messages: [
      {
        role: "system",
        content:
          "You are a precise, inventive word-pair generator. Output only valid JSON matching the schema. Every batch must be fresh and distinct from previous ones.",
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

  const existing = loadExisting();
  const seen = new Set(existing.map(dedupeKey));
  const additions: Candidate[] = [];

  function flush(): void {
    const merged = [...existing, ...additions];
    mkdirSync(dirname(OUT_PATH), { recursive: true });
    writeFileSync(OUT_PATH, `${JSON.stringify(merged, null, 2)}\n`);
  }

  // Overprovision batches generously: as the dedup pool grows the model
  // increasingly regenerates known phrases, so yield drops over a long run.
  // The loop early-exits once it hits `count` net-new regardless.
  const batches = Math.ceil((count / BATCH_SIZE) * 2.5);
  console.log(
    `Generating ${count} new candidates via ${MODEL} (${batches} batches, ${GEN_CONCURRENCY} concurrent)…`,
  );

  let cursor = 0;
  let done = 0;
  const workers = Array.from({ length: GEN_CONCURRENCY }, async () => {
    while (additions.length < count) {
      const b = cursor++;
      if (b >= batches) return;
      // Snapshot of phrases to avoid; cheap nudge, exact dedup happens below.
      const avoid = [...existing, ...additions].map((c) => `${c.a} ${c.b}`);
      let fresh: Candidate[] = [];
      try {
        fresh = await generateBatch(client, BATCH_SIZE, b, avoid);
      } catch (err) {
        console.warn(`  batch ${b + 1} failed, continuing: ${String(err)}`);
        continue;
      }
      let added = 0;
      for (const c of fresh) {
        if (additions.length >= count) break;
        if (!isSingleTokenPair(c)) continue;
        const key = dedupeKey(c);
        if (seen.has(key)) continue;
        seen.add(key);
        additions.push(c);
        added++;
      }
      done++;
      console.log(
        `  batch ${done}/${batches}: ${fresh.length} returned, +${added} new (total ${additions.length}/${count})`,
      );
      if (done % CHECKPOINT_EVERY === 0) flush();
    }
  });
  await Promise.all(workers);

  flush();
  console.log(
    `\nWrote ${OUT_PATH}: +${additions.length} new, ${existing.length + additions.length} total.`,
  );
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
