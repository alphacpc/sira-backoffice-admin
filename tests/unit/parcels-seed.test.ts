import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { ParcelStatus } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const recipient = (name: string) => {
  const found = getStore().parcels.filter((p) => p.recipientName === name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
};

describe("parcels seed: references", () => {
  it("links every parcel to a trip, the route's stations and a company-consistent first leg", () => {
    const s = getStore();
    expect(s.parcels.length).toBeGreaterThan(40);
    for (const p of s.parcels) {
      const trip = s.trips.find((t) => t.id === p.tripId)!;
      const route = s.routes.find((r) => r.id === trip.routeId)!;
      expect(trip.companyId).toBe(p.companyId);
      expect([p.originStationId, p.destinationStationId]).toEqual([route.originId, route.destinationId]);
      expect(p.expectedDeliveryAt).toBe(trip.arrival);
      const legs = s.parcelLegs.filter((l) => l.parcelId === p.id).sort((a, b) => a.sequence - b.sequence);
      expect(legs.length).toBeGreaterThanOrEqual(1);
      expect(legs.length).toBeLessThanOrEqual(2);
      expect(legs.map((l) => l.sequence)).toEqual(legs.map((_, i) => i + 1));
      expect(legs[0]!.tripId).toBe(p.tripId);
      for (const l of legs) expect(l.companyId).toBe(p.companyId);
    }
  });

  it("generates unique, well-formed codes and ids", () => {
    const s = getStore();
    const check = (codes: string[], re: RegExp) => {
      expect(new Set(codes).size).toBe(codes.length);
      for (const c of codes) expect(c).toMatch(re);
    };
    check(s.parcels.map((p) => p.parcelCode), /^PCL-[0-9A-Z]{8}$/);
    check(s.parcels.map((p) => p.trackingNumber), /^TRK-[0-9A-Z]{8}$/);
    for (const list of [s.parcels, s.parcelLegs, s.parcelHistory]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });

  it("ties the sender to a customer or a counter name, and gives every recipient a masked-able phone", () => {
    const s = getStore();
    for (const p of s.parcels) {
      expect(p.recipientPhone).toMatch(/^\+2217713\d{5}$/);
      if (p.senderCustomerId) {
        expect(p.senderName).toBe(s.customers.find((c) => c.id === p.senderCustomerId)!.name);
      } else {
        expect(p.senderName).toBeTruthy();
      }
    }
    expect(s.parcels.some((p) => p.senderCustomerId !== null)).toBe(true);
    expect(s.parcels.some((p) => p.senderCustomerId === null)).toBe(true);
  });
});

describe("parcels seed: statuses", () => {
  it("covers the seven statuses", () => {
    const seen = new Set(getStore().parcels.map((p) => p.status));
    expect([...seen].sort()).toEqual(
      ["AT_HUB", "CANCELLED", "DELIVERED", "IN_TRANSIT", "LOST", "PENDING", "RETURNED"],
    );
  });

  it("follows the trip: cancelled trips cancel their parcels, planned trips keep them pending, others never cancel", () => {
    const s = getStore();
    for (const p of s.parcels) {
      const trip = s.trips.find((t) => t.id === p.tripId)!;
      if (trip.status === "cancelled") expect(p.status).toBe("CANCELLED");
      else expect(p.status).not.toBe("CANCELLED");
      if (trip.status === "planned") expect(p.status).toBe("PENDING");
    }
  });

  it("sets the delivery date only on delivered parcels and the payment status from the parcel's fate", () => {
    for (const p of getStore().parcels) {
      expect(p.actualDeliveryAt === null).toBe(p.status !== "DELIVERED");
      if (p.status === "CANCELLED") expect(p.paymentStatus).toBe("REFUNDED");
      else if (p.status === "PENDING") expect(p.paymentStatus).toBe("PENDING");
      else expect(p.paymentStatus).toBe("PAID");
      expect(p.shippingFee).toBeGreaterThan(0);
    }
  });
});

describe("parcels seed: history", () => {
  it("chains every parcel's history from creation to its current status, oldest first, never in the future", () => {
    const s = getStore();
    for (const p of s.parcels) {
      const h = s.parcelHistory.filter((e) => e.parcelId === p.id).sort((a, b) => a.changedAt.localeCompare(b.changedAt));
      expect(h.length).toBeGreaterThanOrEqual(1);
      expect(h[0]!.previousStatus).toBeNull();
      expect(h[0]!.newStatus).toBe("PENDING");
      expect(h.at(-1)!.newStatus).toBe(p.status);
      for (let i = 1; i < h.length; i++) expect(h[i]!.previousStatus).toBe(h[i - 1]!.newStatus);
      for (const e of h) expect(Date.parse(e.changedAt)).toBeLessThanOrEqual(NOW.getTime());
      expect(p.createdAt).toBe(h[0]!.changedAt);
    }
  });

  it("only uses transitions the parcel state machine allows", () => {
    const allowed: Record<ParcelStatus, ParcelStatus[]> = {
      PENDING: ["IN_TRANSIT", "CANCELLED"], IN_TRANSIT: ["AT_HUB", "DELIVERED", "RETURNED", "LOST"],
      AT_HUB: ["IN_TRANSIT", "DELIVERED", "RETURNED", "LOST"], DELIVERED: [], CANCELLED: [], RETURNED: [], LOST: [],
    };
    for (const e of getStore().parcelHistory.filter((x) => x.previousStatus !== null)) {
      expect(allowed[e.previousStatus!], `${e.previousStatus} → ${e.newStatus}`).toContain(e.newStatus);
    }
  });

  it("has parcels going through a hub with two legs", () => {
    const s = getStore();
    const twoLegs = s.parcels.filter((p) => s.parcelLegs.filter((l) => l.parcelId === p.id).length === 2);
    expect(twoLegs.length).toBeGreaterThan(0);
    for (const p of twoLegs) {
      expect(p.status).toBe("DELIVERED");
      const path = s.parcelHistory.filter((e) => e.parcelId === p.id).sort((a, b) => a.changedAt.localeCompare(b.changedAt)).map((e) => e.newStatus);
      expect(path).toEqual(["PENDING", "IN_TRANSIT", "AT_HUB", "IN_TRANSIT", "DELIVERED"]);
      const [first, second] = s.parcelLegs.filter((l) => l.parcelId === p.id).sort((a, b) => a.sequence - b.sequence);
      expect(second!.tripId).not.toBe(first!.tripId);
      expect(s.trips.find((t) => t.id === second!.tripId)!.companyId).toBe(p.companyId);
    }
  });
});

describe("parcels seed: scenarios", () => {
  it("names one recipient per E2E scenario", () => {
    expect(recipient("Dior Kébé").status).toBe("IN_TRANSIT");
    expect(recipient("Gorgui Sall").status).toBe("PENDING");
    expect(recipient("Yacine Ndoye").status).toBe("DELIVERED");
  });
});

describe("parcels seed: no personal data besides the recipient phone", () => {
  it("keeps e-mails out of parcels, legs and history", () => {
    const s = getStore();
    expect(JSON.stringify([s.parcelLegs, s.parcelHistory])).not.toMatch(/@|\+221/);
    expect(JSON.stringify(s.parcels.map(({ recipientPhone: _p, ...rest }) => rest))).not.toMatch(/@|\+221/);
  });
});
