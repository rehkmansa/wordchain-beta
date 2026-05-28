import type { FreqResult, FreqTier } from "./types";

const DATAMUSE = "https://api.datamuse.com/words";
const WIKIPEDIA = "https://en.wikipedia.org/w/api.php";

async function datamuseHit(a: string, b: string): Promise<boolean> {
  const url = `${DATAMUSE}?rel_bga=${encodeURIComponent(a)}&max=50`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return false;
  const rows = (await res.json()) as Array<{ word: string }>;
  const target = b.toLowerCase();
  return rows.some((r) => r.word.toLowerCase() === target);
}

async function wikipediaCheck(a: string, b: string): Promise<{ exact: boolean; partial: boolean }> {
  const phrase = `${a} ${b}`;
  const url = `${WIKIPEDIA}?action=opensearch&format=json&limit=5&search=${encodeURIComponent(phrase)}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return { exact: false, partial: false };
  const data = (await res.json()) as [string, string[], string[], string[]];
  const titles = (data[1] ?? []).map((t) => t.toLowerCase());
  const target = phrase.toLowerCase();
  const exact = titles.includes(target);
  const partial =
    !exact && titles.some((t) => t.includes(a.toLowerCase()) && t.includes(b.toLowerCase()));
  return { exact, partial };
}

function scoreToTier(score: number): FreqTier | null {
  if (score >= 1.5) return "common";
  if (score >= 0.5) return "normal";
  if (score > 0) return "rare";
  return null;
}

export async function freqGate(a: string, b: string): Promise<FreqResult> {
  const [datamuse, wiki] = await Promise.all([
    datamuseHit(a, b).catch(() => false),
    wikipediaCheck(a, b).catch(() => ({ exact: false, partial: false })),
  ]);
  let score = 0;
  if (datamuse) score += 1;
  if (wiki.exact) score += 1;
  else if (wiki.partial) score += 0.5;
  return {
    datamuse,
    wikipediaExact: wiki.exact,
    wikipediaPartial: wiki.partial,
    score,
    tier: scoreToTier(score),
  };
}
