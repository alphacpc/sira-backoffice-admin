import { describe, expect, it } from "vitest";
import { formatDate, formatMoney, formatNumber, nextBillingLabel } from "@/lib/format";

const norm = (s: string) => s.replace(/[\u00a0\u202f]/g, " ");

describe("format", () => {
  it("formats XOF without decimals", () => {
    expect(norm(formatMoney(25000, "XOF"))).toMatch(/^25 000\s?(F\s?CFA|XOF)$/);
  });
  it("formats numbers with French grouping", () => {
    expect(norm(formatNumber(12345))).toBe("12 345");
  });
  it("formats a date in UTC as dd/mm/yyyy", () => {
    expect(formatDate("2026-03-05T23:30:00Z")).toBe("05/03/2026");
  });
  it("returns a dash for an invalid date", () => {
    expect(formatDate("nope")).toBe("—");
  });
});

describe("nextBillingLabel", () => {
  it("hides the date for canceled and expired subscriptions", () => {
    expect(nextBillingLabel("canceled", "2026-11-10T00:00:00.000Z")).toBe("—");
    expect(nextBillingLabel("expired", "2026-11-10T00:00:00.000Z")).toBe("—");
  });
  it("shows the date otherwise", () => {
    for (const st of ["active", "trial", "past_due", "suspended"])
      expect(nextBillingLabel(st, "2026-11-10T00:00:00.000Z")).toBe("10/11/2026");
  });
});
