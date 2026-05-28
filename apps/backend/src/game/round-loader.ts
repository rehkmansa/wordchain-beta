import { db } from "../db";

type PairRow = {
  id: string;
  word_a: string;
  word_b: string;
  variants_a: string;
  variants_b: string;
};

type LoadedPair = {
  id: string;
  wordA: string;
  wordB: string;
  variantsA: string[];
  variantsB: string[];
};

export function loadPair(pairId: string): LoadedPair | null {
  const row = db
    .query<PairRow, [string]>(
      `SELECT p.id, wa.text AS word_a, wb.text AS word_b, p.variants_a, p.variants_b
       FROM pairs p
       JOIN words wa ON wa.id = p.word_a_id
       JOIN words wb ON wb.id = p.word_b_id
       WHERE p.id = ?`,
    )
    .get(pairId);
  if (!row) return null;
  return {
    id: row.id,
    wordA: row.word_a,
    wordB: row.word_b,
    variantsA: JSON.parse(row.variants_a) as string[],
    variantsB: JSON.parse(row.variants_b) as string[],
  };
}
