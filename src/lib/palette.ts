import { normalizeText } from "@/lib/search-query";

/** Local filter of the palette's static sections: every word of the query must appear in the label. */
export function filterByQuery<T>(items: T[], query: string, label: (item: T) => string): T[] {
  const words = normalizeText(query).split(" ").filter(Boolean);
  if (words.length === 0) return items;
  return items.filter((item) => {
    const text = normalizeText(label(item));
    return words.every((w) => text.includes(w));
  });
}

/** Sections of the palette, in render order. "all" (Voir tous) comes last so cmdk's default selection lands on the first local match. */
export type PaletteSection = "pages" | "companies" | "records" | "all";

export function paletteSections(
  s: { pages: number; companies: number; records: number; canSearchAll: boolean },
): PaletteSection[] {
  const out: PaletteSection[] = [];
  if (s.pages > 0) out.push("pages");
  if (s.companies > 0) out.push("companies");
  if (s.records > 0) out.push("records");
  if (s.canSearchAll) out.push("all");
  return out;
}

/**
 * Hits to show after a server answer. A stale answer (not the latest request) leaves the hits untouched;
 * a failed or thrown one (`null`/`ok: false`) clears them so old hits never outlive an expired session.
 */
export function hitsAfterResponse<T>(
  current: T[], requestId: number, latestId: number, result: { ok: true; value: T[] } | { ok: false } | null,
): T[] {
  if (requestId !== latestId) return current;
  return result !== null && result.ok ? result.value : [];
}
