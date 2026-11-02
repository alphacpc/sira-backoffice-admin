/** Pure helpers shared by the server (repository, action) and the client (palette). No store access. */

export const MIN_QUERY = 2;
export const MAX_QUERY = 100;
export const PAGE_LIMIT = 25;
export const PALETTE_LIMIT = 4;
export const CONTACT_QUERY_MESSAGE =
  "La recherche par e-mail ou téléphone n'est pas disponible : utilise un nom, un code ou un identifiant.";

/** Lowercase, accents stripped, runs of spaces collapsed, trimmed. */
export function normalizeText(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Rank of the first occurrence of an already normalised query in a text: 0 exact, 1 start, 2 start of a word
 * (preceded by a space, `-`, `_`, `.` or `/`), 3 elsewhere; `null` when absent.
 */
export function matchRank(text: string, normalizedQuery: string): number | null {
  const n = normalizeText(text);
  const at = n.indexOf(normalizedQuery);
  if (at < 0) return null;
  if (at === 0) return n === normalizedQuery ? 0 : 1;
  return /[\s\-_./]/.test(n[at - 1]!) ? 2 : 3;
}

/** An e-mail address (contains `@`) or a phone number (digits and separators only, at least 7 digits). */
export function isContactLike(raw: string): boolean {
  const t = raw.trim();
  if (t.includes("@")) return true;
  return /^[+\d\s().-]+$/.test(t) && t.replace(/\D/g, "").length >= 7;
}

/** Why a query cannot be searched, `null` when it can. Order: too short, too long, contact-like. */
export function queryProblem(raw: string): string | null {
  const t = raw.trim();
  if (t.length < MIN_QUERY) return "Saisis au moins 2 caractères";
  if (t.length > MAX_QUERY) return "La recherche est trop longue (100 caractères maximum)";
  if (isContactLike(t)) return CONTACT_QUERY_MESSAGE;
  return null;
}
