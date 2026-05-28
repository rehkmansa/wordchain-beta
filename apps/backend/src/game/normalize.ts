// Normalize an answer for comparison: NFKC, lowercase, strip diacritics,
// trim, collapse whitespace, drop trailing punctuation.
export function normalizeAnswer(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[‘’‚‛′]/g, "'")
    .replace(/[“”„″]/g, '"')
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,!?;:]+$/u, "");
}
