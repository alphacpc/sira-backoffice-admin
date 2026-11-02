import { describe, expect, it } from "vitest";
import { hitsAfterResponse, paletteSections } from "@/lib/palette";

describe("paletteSections", () => {
  it("puts Voir tous last so the first local match keeps the default selection", () => {
    expect(paletteSections({ pages: 1, companies: 2, records: 3, canSearchAll: true }))
      .toEqual(["pages", "companies", "records", "all"]);
    expect(paletteSections({ pages: 0, companies: 1, records: 0, canSearchAll: true })).toEqual(["companies", "all"]);
  });
  it("leaves Voir tous as the only (hence selected) item without local matches", () => {
    expect(paletteSections({ pages: 0, companies: 0, records: 0, canSearchAll: true })).toEqual(["all"]);
  });
  it("omits Voir tous when the query cannot be searched", () => {
    expect(paletteSections({ pages: 1, companies: 0, records: 0, canSearchAll: false })).toEqual(["pages"]);
    expect(paletteSections({ pages: 0, companies: 0, records: 0, canSearchAll: false })).toEqual([]);
  });
});

describe("hitsAfterResponse", () => {
  it("takes the value of the latest successful answer", () => {
    expect(hitsAfterResponse(["old"], 3, 3, { ok: true, value: ["new"] })).toEqual(["new"]);
  });
  it("ignores a stale answer, success or failure", () => {
    expect(hitsAfterResponse(["cur"], 2, 3, { ok: true, value: ["x"] })).toEqual(["cur"]);
    expect(hitsAfterResponse(["cur"], 2, 3, { ok: false })).toEqual(["cur"]);
    expect(hitsAfterResponse(["cur"], 2, 3, null)).toEqual(["cur"]);
  });
  it("clears the hits when the latest answer failed or threw", () => {
    expect(hitsAfterResponse(["old"], 3, 3, { ok: false })).toEqual([]);
    expect(hitsAfterResponse(["old"], 3, 3, null)).toEqual([]);
  });
});
