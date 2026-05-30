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

// Real corpus frequency of the bigram "a b" in occurrences-per-million, via
// Datamuse's `md=f` metadata. Returns null when the phrase is unknown to the
// corpus — which is itself a signal the phrase may not be real.
async function bigramFrequency(a: string, b: string): Promise<number | null> {
  const phrase = `${a} ${b}`.toLowerCase();
  const url = `${DATAMUSE}?sp=${encodeURIComponent(phrase)}&md=f&max=1`;
  const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
  if (!res.ok) return null;
  const rows = (await res.json()) as Array<{ word: string; tags?: string[] }>;
  const row = rows.find((r) => r.word.toLowerCase() === phrase);
  const fTag = row?.tags?.find((t) => t.startsWith("f:"));
  if (!fTag) return null;
  const value = Number(fTag.slice(2));
  return Number.isFinite(value) ? value : null;
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

// Tiering by real bigram frequency (occurrences per million words). Thresholds
// are conservative so genuinely-common phrases land in `common` and the long
// tail of real-but-uncommon phrases becomes the harder `rare` tier.
function freqToTier(freq: number): FreqTier {
  if (freq >= 1) return "common";
  if (freq >= 0.05) return "normal";
  return "rare";
}

// A pair is accepted only when it is backed by a REAL signal:
//   - a known Datamuse bigram frequency (the phrase exists in a real corpus), or
//   - a real Datamuse collocation (b genuinely follows a), or
//   - an exact Wikipedia article title.
// A Wikipedia *partial* match alone is NOT enough — that loophole was the source
// of weird / not-actually-real pairs, so it is rejected.
export async function freqGate(a: string, b: string): Promise<FreqResult> {
  const [datamuse, wiki, freq] = await Promise.all([
    datamuseHit(a, b).catch(() => false),
    wikipediaCheck(a, b).catch(() => ({ exact: false, partial: false })),
    bigramFrequency(a, b).catch(() => null),
  ]);

  let score = 0;
  if (datamuse) score += 1;
  if (wiki.exact) score += 1;
  if (freq !== null) score += 1;

  let tier: FreqTier | null;
  if (freq !== null) {
    tier = freqToTier(freq);
  } else if (datamuse && wiki.exact) {
    tier = "normal";
  } else if (datamuse || wiki.exact) {
    tier = "rare";
  } else {
    tier = null;
  }

  return {
    datamuse,
    wikipediaExact: wiki.exact,
    wikipediaPartial: wiki.partial,
    freq,
    score,
    tier,
  };
}
