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
