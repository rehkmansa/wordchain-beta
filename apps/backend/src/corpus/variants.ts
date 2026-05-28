import pluralize from "pluralize";

// Returns the accepted alternate spellings for a single word. The canonical
// (lowercased) form is intentionally excluded — callers match canonical
// separately. Possessives are derived rule-based since pluralize doesn't
// cover them.
export function generateVariants(word: string): string[] {
  const lower = word.toLowerCase().trim();
  if (!lower) return [];
  const out = new Set<string>();

  const plural = pluralize.plural(lower);
  if (plural !== lower) out.add(plural);

  const singular = pluralize.singular(lower);
  if (singular !== lower) out.add(singular);

  // Possessive of the canonical form: "Master" → "Master's"
  out.add(lower.endsWith("s") ? `${lower}'` : `${lower}'s`);

  return [...out];
}
