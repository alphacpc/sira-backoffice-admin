"use server";

import { runValue, type ValueResult } from "@/lib/actions/run";
import { SEARCH_TYPES, searchRepo, type SearchHit } from "@/lib/repos/search";
import { PALETTE_LIMIT } from "@/lib/search-query";

/** Palette lookup: every type except companies (the palette already lists them), a few hits per type. */
export async function searchEverywhere(query: string): Promise<ValueResult<SearchHit[]>> {
  return runValue(() => {
    if (typeof query !== "string") return [];
    const result = searchRepo.search(query, {
      types: SEARCH_TYPES.filter((t) => t !== "company"), limitPerType: PALETTE_LIMIT,
    });
    return result.groups.flatMap((g) => g.hits);
  });
}
