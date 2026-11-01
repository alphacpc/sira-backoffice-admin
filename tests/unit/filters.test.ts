import { describe, expect, it } from "vitest";
import { parseFilter } from "@/lib/filters";

describe("parseFilter", () => {
  const allowed = ["paid", "failed"] as const;
  it("returns an allowed value", () => {
    expect(parseFilter("failed", allowed)).toBe("failed");
  });
  it("returns undefined for a missing or unknown value", () => {
    expect(parseFilter(undefined, allowed)).toBeUndefined();
    expect(parseFilter("all", allowed)).toBeUndefined();
    expect(parseFilter("PAID", allowed)).toBeUndefined();
  });
});
