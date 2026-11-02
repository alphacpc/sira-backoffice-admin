import { beforeEach, describe, expect, it } from "vitest";
import { parcelsRepo } from "@/lib/repos/parcels";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const named = (name: string) => getStore().parcels.find((p) => p.recipientName === name)!;
const declare = (name: string, reason = "Introuvable au hub") =>
  parcelsRepo.declareLost(named(name).id, reason, "tester@sira.app", NOW);

describe("declaring a parcel lost", () => {
  it("marks an in-transit parcel lost, adds a history line and journals it", () => {
    const target = named("Dior Kébé");
    const historyBefore = getStore().parcelHistory.filter((h) => h.parcelId === target.id).length;
    const n = getStore().activity.length;
    const result = declare("Dior Kébé", "  Introuvable au hub  ");
    expect(result).toBe(target);
    expect(target.status).toBe("LOST");
    expect(target.actualDeliveryAt).toBeNull();
    const history = getStore().parcelHistory.filter((h) => h.parcelId === target.id);
    expect(history).toHaveLength(historyBefore + 1);
    expect(history.at(-1)).toMatchObject({
      previousStatus: "IN_TRANSIT", newStatus: "LOST", notes: "Introuvable au hub",
      changedBy: "tester@sira.app", changedAt: NOW.toISOString(),
    });
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Colis ${target.parcelCode} déclaré perdu. Motif : Introuvable au hub`,
    });
  });

  it("also accepts a parcel waiting at a hub", () => {
    const hub = getStore().parcels.find((p) => p.status === "AT_HUB")!;
    parcelsRepo.declareLost(hub.id, "Perdu au hub", "tester@sira.app", NOW);
    expect(hub.status).toBe("LOST");
    expect(getStore().parcelHistory.filter((h) => h.parcelId === hub.id).at(-1)!.previousStatus).toBe("AT_HUB");
  });

  it("refuses an unknown parcel", () => {
    expect(() => parcelsRepo.declareLost("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Colis introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = named("Dior Kébé");
    const n = getStore().activity.length;
    expect(() => declare("Dior Kébé", "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("IN_TRANSIT");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a closed parcel and leaves its history untouched", () => {
    const target = named("Yacine Ndoye");
    const history = getStore().parcelHistory.filter((h) => h.parcelId === target.id).length;
    expect(() => declare("Yacine Ndoye")).toThrow("Ce colis est déjà clos");
    expect(target.status).toBe("DELIVERED");
    expect(getStore().parcelHistory.filter((h) => h.parcelId === target.id)).toHaveLength(history);
  });

  it("refuses every other closed status", () => {
    for (const status of ["CANCELLED", "RETURNED", "LOST"] as const) {
      const p = getStore().parcels.find((x) => x.status === status)!;
      expect(() => parcelsRepo.declareLost(p.id, "motif")).toThrow("Ce colis est déjà clos");
    }
  });

  it("refuses a pending parcel", () => {
    const target = named("Gorgui Sall");
    expect(() => declare("Gorgui Sall")).toThrow("Un colis en attente ne peut pas être déclaré perdu");
    expect(target.status).toBe("PENDING");
  });

  it("checks the guards in order: unknown, reason, closed, pending", () => {
    const closed = named("Yacine Ndoye");
    expect(() => parcelsRepo.declareLost(closed.id, "")).toThrow("Un motif est obligatoire");
    const pending = named("Gorgui Sall");
    expect(() => parcelsRepo.declareLost(pending.id, "")).toThrow("Un motif est obligatoire");
  });
});

describe("revealing a recipient phone", () => {
  it("journals the reveal on the parcel's company without writing the number", () => {
    const target = named("Yacine Ndoye");
    const n = getStore().activity.length;
    parcelsRepo.logReveal(target.id, "tester@sira.app", NOW);
    expect(getStore().activity).toHaveLength(n + 1);
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Donnée personnelle révélée : téléphone du destinataire du colis ${target.parcelCode}`,
    });
    expect(entry.action).not.toContain(target.recipientPhone);
  });

  it("refuses an unknown parcel without journaling", () => {
    const n = getStore().activity.length;
    expect(() => parcelsRepo.logReveal("00000000-0000-4000-8000-000000000000")).toThrow("Colis introuvable");
    expect(getStore().activity).toHaveLength(n);
  });
});
