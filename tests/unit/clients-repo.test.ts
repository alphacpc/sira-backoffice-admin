import { beforeEach, describe, expect, it } from "vitest";
import { customersRepo, feedbackIgnoreBlockReason, feedbackRepo, loyaltyRepo } from "@/lib/repos/clients";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const customerNamed = (name: string) => getStore().customers.find((c) => c.name === name)!;
const feedbackTitled = (title: string) => getStore().feedbacks.find((f) => f.title === title)!;

describe("customer list", () => {
  it("lists the four customers with counters and no personal data", () => {
    const s = getStore();
    const rows = customersRepo.listRows();
    expect(rows).toHaveLength(4);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "accountCount", "createdAt", "feedbackCount", "id", "isCorporate", "name", "onlineBookings", "parcelCount",
      "sponsored", "totalPoints", "userStatus",
    ]);
    for (const r of rows) {
      const c = s.customers.find((x) => x.id === r.id)!;
      const accounts = s.loyaltyAccounts.filter((a) => a.customerId === c.id);
      expect(r.accountCount).toBe(accounts.length);
      expect(r.totalPoints).toBe(accounts.reduce((n, a) => n + a.points, 0));
      expect(r.onlineBookings).toBe(s.bookings.filter((b) => b.userId === c.userId).length);
      expect(r.parcelCount).toBe(s.parcels.filter((p) => p.senderCustomerId === c.id).length);
      expect(r.feedbackCount).toBe(s.feedbacks.filter((f) => f.customerId === c.id).length);
      expect(r.sponsored).toBe(c.sponsorshipId !== null);
      expect(r.userStatus).toBe(s.users.find((u) => u.id === c.userId)!.status);
    }
    expect(JSON.stringify(rows)).not.toMatch(/@|\+221/);
    expect(rows.find((r) => r.name === "Pape Mbaye")!.userStatus).toBe("suspended");
  });
});

describe("customer detail", () => {
  it("returns undefined for an unknown customer", () => {
    expect(customersRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("returns loyalty accounts with their movements, newest first", () => {
    const s = getStore();
    const target = s.customers.find((c) => s.loyaltyAccounts.some((a) => a.customerId === c.id))!;
    const d = customersRepo.detail(target.id)!;
    expect(d.accounts.length).toBe(s.loyaltyAccounts.filter((a) => a.customerId === target.id).length);
    for (const a of d.accounts) {
      expect(a.companyName).not.toBe("—");
      expect(a.programName).toMatch(/^Fidélité /);
      expect(a.movements.reduce((n, m) => n + m.points, 0)).toBe(a.points);
      for (let i = 1; i < a.movements.length; i++) expect(a.movements[i - 1]!.createdAt >= a.movements[i]!.createdAt).toBe(true);
      for (const m of a.movements) expect(m.bookingCode).toMatch(/^BK-/);
    }
    expect(d.totalPoints).toBe(d.accounts.reduce((n, a) => n + a.points, 0));
  });

  it("returns the sponsorships given and the one used", () => {
    const s = getStore();
    const sponsor = customerNamed("Aïssatou Sarr");
    const given = customersRepo.detail(sponsor.id)!;
    expect(given.sponsorships.map((x) => x.status).sort()).toEqual(["ACTIVE", "REDEEMED"]);
    expect(given.sponsoredBy).toBeNull();
    const sponsored = s.customers.find((c) => c.sponsorshipId !== null)!;
    const d = customersRepo.detail(sponsored.id)!;
    expect(d.sponsoredBy).toMatchObject({ sponsorName: "Aïssatou Sarr" });
    expect(d.sponsoredBy!.code).toMatch(/^SPN-/);
    expect(Object.keys(given.sponsorships[0]!).sort()).toEqual([
      "code", "companyName", "createdAt", "currency", "expiresAt", "id", "rewardType", "rewardValue", "status",
    ]);
  });

  it("returns the customer's bookings (newest first, at most 10) and reviews", () => {
    const s = getStore();
    const target = s.customers.find((c) => s.bookings.filter((b) => b.userId === c.userId).length > 0)!;
    const d = customersRepo.detail(target.id)!;
    expect(d.bookings.length).toBeGreaterThan(0);
    expect(d.bookings.length).toBeLessThanOrEqual(10);
    for (let i = 1; i < d.bookings.length; i++) expect(d.bookings[i - 1]!.createdAt >= d.bookings[i]!.createdAt).toBe(true);
    expect(Object.keys(d.bookings[0]!).sort()).toEqual([
      "amount", "bookingCode", "createdAt", "currency", "departure", "id", "paymentStatus", "routeLabel", "status",
    ]);
    expect(d.feedbacks.every((f) => f.customerId === target.id)).toBe(true);
    expect(d.feedbacks.length).toBe(s.feedbacks.filter((f) => f.customerId === target.id).length);
    expect(d.userId).toBe(target.userId);
    expect(d.parcelCount).toBe(s.parcels.filter((p) => p.senderCustomerId === target.id).length);
  });
});

describe("loyalty programs", () => {
  it("lists programs with their accounts and the points they distributed", () => {
    const s = getStore();
    const rows = loyaltyRepo.listPrograms({});
    expect(rows).toHaveLength(s.loyaltyPrograms.length);
    for (const r of rows) {
      const accounts = s.loyaltyAccounts.filter((a) => a.companyId === r.companyId);
      expect(r.accounts).toBe(accounts.length);
      expect(r.pointsIssued).toBe(accounts.reduce((n, a) => n + a.points, 0));
    }
    expect(rows.filter((r) => r.status === "INACTIVE")).toHaveLength(1);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "accounts", "companyId", "companyName", "id", "minPointsForRedemption", "name", "pointsIssued",
      "pointsPerCurrencyUnit", "redemptionRate", "status",
    ]);
  });

  it("filters by company", () => {
    const companyId = getStore().loyaltyPrograms[0]!.companyId;
    const rows = loyaltyRepo.listPrograms({ companyId });
    expect(rows).toHaveLength(1);
    expect(rows[0]!.companyId).toBe(companyId);
  });
});

describe("feedback list and detail", () => {
  it("lists reviews newest first and filters by company and status", () => {
    const s = getStore();
    const all = feedbackRepo.listRows({});
    expect(all).toHaveLength(s.feedbacks.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const pending = feedbackRepo.listRows({ status: "PENDING" });
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === "PENDING")).toBe(true);
    const companyId = s.feedbacks[0]!.companyId;
    expect(feedbackRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
    expect(Object.keys(all[0]!).sort()).toEqual([
      "companyId", "companyName", "createdAt", "customerId", "customerName", "feedbackType", "id", "rating",
      "responded", "status", "title",
    ]);
  });

  it("returns a detail with the references and the ignore rule, undefined when unknown", () => {
    const trip = getStore().feedbacks.find((f) => f.feedbackType === "TRIP")!;
    const d = feedbackRepo.detail(trip.id)!;
    expect(d.customerName).not.toBe("—");
    expect(d.tripLabel).toMatch(/→/);
    expect(d.bookingCode).toMatch(/^BK-/);
    expect(d.parcelCode).toBeNull();
    const parcel = getStore().feedbacks.find((f) => f.feedbackType === "PARCEL")!;
    expect(feedbackRepo.detail(parcel.id)!.parcelCode).toMatch(/^PCL-/);
    expect(feedbackRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("explains when a review cannot be ignored", () => {
    expect(feedbackIgnoreBlockReason(feedbackTitled("Climatisation en panne pendant le trajet"))).toBeNull();
    expect(feedbackIgnoreBlockReason(feedbackTitled("Service impeccable au guichet"))).toBe("Cet avis est déjà traité");
    const reviewed = getStore().feedbacks.find((f) => f.status === "REVIEWED")!;
    expect(feedbackIgnoreBlockReason(reviewed)).toBeNull();
    const ignored = getStore().feedbacks.find((f) => f.status === "IGNORED")!;
    expect(feedbackIgnoreBlockReason(ignored)).toBe("Cet avis est déjà traité");
    expect(feedbackRepo.detail(ignored.id)!.ignoreBlockedReason).toBe("Cet avis est déjà traité");
  });
});
