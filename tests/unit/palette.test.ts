import { describe, expect, it } from "vitest";
import { filterByQuery } from "@/lib/palette";

const items = [{ n: "Louga Trans" }, { n: "Thiès Express" }, { n: "Saint-Louis Bus" }];
const label = (i: { n: string }) => i.n;

describe("filterByQuery", () => {
  it("keeps everything for an empty or blank query", () => {
    expect(filterByQuery(items, "", label)).toEqual(items);
    expect(filterByQuery(items, "   ", label)).toEqual(items);
  });
  it("matches substrings without regard to case or accents", () => {
    expect(filterByQuery(items, "LOUGA", label).map(label)).toEqual(["Louga Trans"]);
    expect(filterByQuery(items, "thies", label).map(label)).toEqual(["Thiès Express"]);
    expect(filterByQuery(items, "louis", label).map(label)).toEqual(["Saint-Louis Bus"]);
  });
  it("matches every word of a multi-word query", () => {
    expect(filterByQuery(items, "trans louga", label).map(label)).toEqual(["Louga Trans"]);
    expect(filterByQuery(items, "louga bus", label)).toEqual([]);
  });
  it("returns nothing when nothing matches", () => {
    expect(filterByQuery(items, "zzz", label)).toEqual([]);
  });
});
