import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

describe("customers seed", () => {
  it("creates one customer per client account, only the last one corporate", () => {
    const s = getStore();
    expect(s.customers).toHaveLength(4);
    for (const c of s.customers) {
      const user = s.users.find((u) => u.id === c.userId)!;
      expect(user.roleCode).toBe("USER");
      expect(c.name).toBe(user.displayName);
      expect(c.createdAt).toBe(user.createdAt);
    }
    expect(s.customers.map((c) => c.isCorporate)).toEqual([false, false, false, true]);
    expect(new Set(s.customers.map((c) => c.userId)).size).toBe(4);
  });

  it("holds no e-mail and no phone number", () => {
    const text = JSON.stringify([getStore().customers, getStore().loyaltyAccounts, getStore().sponsorships]);
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\+221/);
  });
});

describe("loyalty seed", () => {
  it("gives the first eight active companies a program, exactly one inactive, none to the others", () => {
    const s = getStore();
    const active = s.companies.filter((c) => c.status === "active");
    expect(s.loyaltyPrograms.map((p) => p.companyId)).toEqual(active.slice(0, 8).map((c) => c.id));
    expect(s.loyaltyPrograms.filter((p) => p.status === "INACTIVE")).toHaveLength(1);
    for (const p of s.loyaltyPrograms) {
      expect(p).toMatchObject({ pointsPerCurrencyUnit: 0.01, redemptionRate: 5, minPointsForRedemption: 1000 });
    }
  });

  it("derives one transaction from each paid online confirmed booking of a customer at a company with an active program", () => {
    const s = getStore();
    const eligible = s.bookings.filter((b) =>
      b.channel === "online" && b.status === "confirmed" && b.paymentStatus === "paid"
      && s.customers.some((c) => c.userId === b.userId)
      && s.loyaltyPrograms.some((p) => p.companyId === b.companyId && p.status === "ACTIVE"));
    expect(eligible.length).toBeGreaterThan(0);
    expect(s.loyaltyTransactions).toHaveLength(eligible.length);
    for (const b of eligible) {
      const customer = s.customers.find((c) => c.userId === b.userId)!;
      const account = s.loyaltyAccounts.find((a) => a.customerId === customer.id && a.companyId === b.companyId)!;
      const tx = s.loyaltyTransactions.find((t) => t.bookingId === b.id)!;
      expect(tx.accountId).toBe(account.id);
      expect(tx.points).toBe(Math.floor(b.amount * 0.01));
    }
  });

  it("keeps each account's points equal to the sum of its transactions, one account per customer and company", () => {
    const s = getStore();
    expect(s.loyaltyAccounts.length).toBeGreaterThan(0);
    const keys = s.loyaltyAccounts.map((a) => `${a.customerId}/${a.companyId}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const a of s.loyaltyAccounts) {
      const sum = s.loyaltyTransactions.filter((t) => t.accountId === a.id).reduce((n, t) => n + t.points, 0);
      expect(a.points).toBe(sum);
      expect(a.points).toBeGreaterThan(0);
      expect(["REGULAR", "VIP", "PREMIUM"]).toContain(a.membershipType);
    }
  });

  it("never opens an account at a company without an active program", () => {
    const s = getStore();
    const active = new Set(s.loyaltyPrograms.filter((p) => p.status === "ACTIVE").map((p) => p.companyId));
    for (const a of s.loyaltyAccounts) expect(active.has(a.companyId)).toBe(true);
  });
});

describe("sponsorship seed", () => {
  it("has an active, a redeemed and an expired sponsorship with unique codes", () => {
    const s = getStore();
    expect(s.sponsorships.map((x) => x.status).sort()).toEqual(["ACTIVE", "EXPIRED", "REDEEMED"]);
    expect(new Set(s.sponsorships.map((x) => x.code)).size).toBe(3);
    for (const x of s.sponsorships) expect(x.code).toMatch(/^SPN-[0-9A-Z]{8}$/);
    const expired = s.sponsorships.find((x) => x.status === "EXPIRED")!;
    expect(Date.parse(expired.expiresAt)).toBeLessThan(NOW.getTime());
    const active = s.sponsorships.find((x) => x.status === "ACTIVE")!;
    expect(Date.parse(active.expiresAt)).toBeGreaterThan(NOW.getTime());
  });

  it("links exactly one sponsored customer to the redeemed sponsorship, never to their own", () => {
    const s = getStore();
    const sponsored = s.customers.filter((c) => c.sponsorshipId !== null);
    expect(sponsored).toHaveLength(1);
    const used = s.sponsorships.find((x) => x.id === sponsored[0]!.sponsorshipId)!;
    expect(used.status).toBe("REDEEMED");
    expect(used.sponsorCustomerId).not.toBe(sponsored[0]!.id);
    expect(sponsored[0]!.sponsoredAt).not.toBeNull();
    for (const c of s.customers.filter((x) => x.sponsorshipId === null)) expect(c.sponsoredAt).toBeNull();
  });
});

describe("feedback seed", () => {
  it("references existing customers, companies and, when given, trips, parcels and bookings of the same company", () => {
    const s = getStore();
    expect(s.feedbacks.length).toBeGreaterThan(10);
    for (const f of s.feedbacks) {
      expect(s.customers.some((c) => c.id === f.customerId)).toBe(true);
      expect(s.companies.some((c) => c.id === f.companyId)).toBe(true);
      expect(f.rating).toBeGreaterThanOrEqual(1);
      expect(f.rating).toBeLessThanOrEqual(5);
      if (f.bookingId) {
        const b = s.bookings.find((x) => x.id === f.bookingId)!;
        expect(b.companyId).toBe(f.companyId);
        expect(b.paymentStatus).toBe("paid");
        expect(s.customers.find((c) => c.id === f.customerId)!.userId).toBe(b.userId);
      }
      if (f.parcelId) expect(s.parcels.find((x) => x.id === f.parcelId)!.companyId).toBe(f.companyId);
      if (f.tripId) expect(s.trips.find((x) => x.id === f.tripId)!.companyId).toBe(f.companyId);
      if (f.feedbackType === "PARCEL") expect(f.parcelId).not.toBeNull();
      if (f.feedbackType === "TRIP") expect(f.bookingId).not.toBeNull();
    }
  });

  it("covers the four statuses and the three feedback types it produces; only resolved reviews carry a response", () => {
    const s = getStore();
    expect(new Set(s.feedbacks.map((f) => f.status))).toEqual(new Set(["PENDING", "REVIEWED", "RESOLVED", "IGNORED"]));
    expect(new Set(s.feedbacks.map((f) => f.feedbackType))).toEqual(new Set(["TRIP", "PARCEL", "SERVICE"]));
    for (const f of s.feedbacks) {
      expect(f.response !== null).toBe(f.status === "RESOLVED");
      expect(f.respondedAt !== null).toBe(f.status === "RESOLVED");
      expect(Date.parse(f.createdAt)).toBeLessThanOrEqual(NOW.getTime());
      if (f.respondedAt) {
        expect(f.respondedAt >= f.createdAt).toBe(true);
        expect(Date.parse(f.respondedAt)).toBeLessThanOrEqual(NOW.getTime());
      }
    }
  });

  it("has exactly one review per scenario title", () => {
    const s = getStore();
    const pending = s.feedbacks.filter((f) => f.title === "Climatisation en panne pendant le trajet");
    const resolved = s.feedbacks.filter((f) => f.title === "Service impeccable au guichet");
    expect(pending.map((f) => f.status)).toEqual(["PENDING"]);
    expect(resolved.map((f) => f.status)).toEqual(["RESOLVED"]);
  });

  it("holds no e-mail and no phone number", () => {
    expect(JSON.stringify(getStore().feedbacks)).not.toMatch(/@|\+221/);
  });
});
