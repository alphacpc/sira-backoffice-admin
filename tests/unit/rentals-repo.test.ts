import { beforeEach, describe, expect, it } from "vitest";
import { rentalsRepo } from "@/lib/repos/rentals";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-06-15T10:00:00Z");
beforeEach(() => resetStore(NOW));

const byStatus = (s: string) => getStore().rentals.find((r) => r.status === s)!;

describe("rentals", () => {
  it("seeds every status and masks the customer phone", () => {
    const rows = rentalsRepo.listRows({});
    expect(new Set(rows.map((r) => r.status))).toEqual(new Set(["REQUESTED", "QUOTED", "CONFIRMED", "COMPLETED", "CANCELLED"]));
    expect(rows.every((r) => r.customerPhone.includes("•"))).toBe(true);
    expect(rentalsRepo.listRows({ status: "QUOTED" }).every((r) => r.status === "QUOTED")).toBe(true);
  });

  it("flags the two confirmed rentals that share a bus on the same dates", () => {
    const flagged = rentalsRepo.listRows({}).filter((r) => r.conflicts.length > 0);
    expect(flagged).toHaveLength(2);
    expect(flagged[0]!.conflicts).toContain(flagged[1]!.rentalCode);
  });

  it("walks a request to completion: quote, assign, deposit, confirm, balance, complete", () => {
    const r = byStatus("REQUESTED");
    expect(() => rentalsRepo.confirm(r.id)).toThrow();
    rentalsRepo.quote(r.id, 200_000);
    expect(r.status).toBe("QUOTED");
    expect(r.depositRequired).toBe(60_000);
    expect(() => rentalsRepo.confirm(r.id)).toThrow(/bus et un chauffeur/);
    const d = rentalsRepo.detail(r.id)!;
    rentalsRepo.assign(r.id, d.buses[0]!.id, d.drivers[0]!.id);
    expect(() => rentalsRepo.confirm(r.id)).toThrow(/acompte/);
    rentalsRepo.recordPayment(r.id, 60_000);
    rentalsRepo.confirm(r.id);
    expect(r.status).toBe("CONFIRMED");
    expect(() => rentalsRepo.complete(r.id)).toThrow(/solde/);
    rentalsRepo.recordPayment(r.id, 140_000);
    rentalsRepo.complete(r.id);
    expect(rentalsRepo.detail(r.id)!.rental.payment).toBe("settled");
    expect(r.history.length).toBeGreaterThanOrEqual(6);
  });

  it("rejects bad quotes, overpayment, foreign buses and too-small buses", () => {
    const q = byStatus("QUOTED");
    expect(() => rentalsRepo.quote(q.id, 1000)).toThrow();
    const r = byStatus("REQUESTED");
    expect(() => rentalsRepo.quote(r.id, 0)).toThrow(/positif/);
    expect(() => rentalsRepo.recordPayment(q.id, q.quoteAmount! + 1)).toThrow(/dépasse/);
    const foreign = getStore().buses.find((b) => b.companyId !== q.companyId)!;
    const driver = getStore().crew.find((c) => c.companyId === q.companyId && c.role === "DRIVER")!;
    expect(() => rentalsRepo.assign(q.id, foreign.id, driver.id)).toThrow(/introuvable/);
  });

  it("refuses to assign a bus already confirmed on overlapping dates", () => {
    const flagged = rentalsRepo.listRows({}).filter((r) => r.conflicts.length > 0);
    const [a, b] = flagged.map((f) => getStore().rentals.find((r) => r.id === f.id)!);
    const bus = rentalsRepo.detail(a!.id)!.buses[0]!;
    expect(() => rentalsRepo.assign(a!.id, bus.id, b!.driverId!)).toThrow(/déjà pris/);
  });

  it("cancels with a reason before departure only", () => {
    const r = byStatus("QUOTED");
    expect(() => rentalsRepo.cancel(r.id, "  ")).toThrow(/motif/);
    rentalsRepo.cancel(r.id, "Client injoignable", "admin@sira.app", NOW);
    expect(r.status).toBe("CANCELLED");
    expect(() => rentalsRepo.cancel(r.id, "encore")).toThrow();
    const done = byStatus("COMPLETED");
    expect(() => rentalsRepo.cancel(done.id, "trop tard")).toThrow();
  });
});
