import { describe, expect, it } from "vitest";
import { checkReason, MAX_REASON, REASON_TOO_LONG } from "@/lib/validation";

describe("checkReason", () => {
  it("refuses a non-string with the non-string message", () => {
    expect(() => checkReason(42, "blank", "nonstring")).toThrow("nonstring");
    expect(() => checkReason(undefined, "blank")).toThrow("blank");
  });
  it("refuses a blank string with the blank message", () => {
    expect(() => checkReason("   ", "blank", "nonstring")).toThrow("blank");
    expect(() => checkReason("", "blank")).toThrow("blank");
  });
  it("trims the value", () => {
    expect(checkReason("  ok  ", "blank")).toBe("ok");
  });
  it("accepts 500 characters and refuses 501", () => {
    expect(checkReason("a".repeat(MAX_REASON), "blank")).toHaveLength(500);
    expect(() => checkReason("a".repeat(MAX_REASON + 1), "blank")).toThrow(REASON_TOO_LONG);
  });
  it("measures the length after trimming", () => {
    expect(checkReason(` ${"a".repeat(500)} `, "blank")).toHaveLength(500);
  });
});
