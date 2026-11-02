import { beforeEach, describe, expect, it } from "vitest";
import { lostBlockReason, parcelsRepo } from "@/lib/repos/parcels";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const named = (name: string) => getStore().parcels.find((p) => p.recipientName === name)!;

describe("parcel list", () => {
  it("lists every parcel newest first and filters by company and status", () => {
    const s = getStore();
    const all = parcelsRepo.listRows({});
    expect(all).toHaveLength(s.parcels.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const companyId = s.parcels[0]!.companyId;
    const mine = parcelsRepo.listRows({ companyId });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.companyId === companyId)).toBe(true);
    const lost = parcelsRepo.listRows({ status: "LOST" });
    expect(lost.length).toBeGreaterThan(0);
    expect(lost.every((r) => r.status === "LOST")).toBe(true);
    const both = parcelsRepo.listRows({ companyId, status: "DELIVERED" });
    expect(both.every((r) => r.companyId === companyId && r.status === "DELIVERED")).toBe(true);
  });

  it("exposes only client-safe fields, never the phone", () => {
    const row = parcelsRepo.listRows({})[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "companyId", "companyName", "createdAt", "currency", "id", "legCount", "parcelCode", "parcelType",
      "paymentStatus", "recipientName", "routeLabel", "senderName", "shippingFee", "status", "trackingNumber", "weightKg",
    ]);
    expect(row.routeLabel).toMatch(/→/);
    expect(JSON.stringify(parcelsRepo.listRows({}))).not.toMatch(/\+221/);
  });

  it("counts the legs of a parcel", () => {
    const s = getStore();
    const two = s.parcelLegs.find((l) => l.sequence === 2)!;
    expect(parcelsRepo.listRows({}).find((r) => r.id === two.parcelId)!.legCount).toBe(2);
  });
});

describe("parcel detail", () => {
  it("returns undefined for an unknown parcel", () => {
    expect(parcelsRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("returns legs in order, history oldest first, the masked phone and the loss rule", () => {
    const s = getStore();
    const two = s.parcelLegs.find((l) => l.sequence === 2)!;
    const d = parcelsRepo.detail(two.parcelId)!;
    expect(d.legs.map((l) => l.sequence)).toEqual([1, 2]);
    expect(d.legs[0]!.routeLabel).toMatch(/→/);
    expect(d.history.map((h) => h.newStatus)).toEqual(["PENDING", "IN_TRANSIT", "AT_HUB", "IN_TRANSIT", "DELIVERED"]);
    expect(d.originName).not.toBe("—");
    expect(d.recipientPhoneMasked).toMatch(/^\+221•+\d{2}$/);
    expect(d.recipientPhoneMasked).not.toBe(d.parcel.recipientPhone);
    expect(d.lostBlockedReason).toBe("Ce colis est déjà clos");
  });

  it("explains when a parcel cannot be declared lost", () => {
    expect(lostBlockReason(named("Dior Kébé"))).toBeNull();
    expect(lostBlockReason(named("Gorgui Sall"))).toBe("Un colis en attente ne peut pas être déclaré perdu");
    expect(lostBlockReason(named("Yacine Ndoye"))).toBe("Ce colis est déjà clos");
    const hub = getStore().parcels.find((p) => p.status === "AT_HUB")!;
    expect(lostBlockReason(hub)).toBeNull();
    for (const status of ["CANCELLED", "RETURNED", "LOST"] as const) {
      expect(lostBlockReason({ ...hub, status })).toBe("Ce colis est déjà clos");
    }
  });
});
