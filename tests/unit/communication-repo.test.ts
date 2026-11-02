import { beforeEach, describe, expect, it } from "vitest";
import {
  campaignCancelBlockReason, campaignsRepo, describeCriteria, eligibleCount, messagesRepo, notificationsRepo,
  schedulesRepo, segmentsRepo,
} from "@/lib/repos/communication";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const campaignNamed = (name: string) => getStore().marketingCampaigns.find((c) => c.name === name)!;

describe("targeting", () => {
  it("describes criteria in plain French", () => {
    expect(describeCriteria({})).toBe("Tous les clients");
    expect(describeCriteria({ membershipType: "vip" })).toBe("Palier : VIP");
    expect(describeCriteria({ membershipType: "Premium" })).toBe("Palier : PREMIUM");
    expect(describeCriteria({ membershipType: "gold" })).toBe("Palier inconnu « gold » (aucun client)");
    expect(describeCriteria({ lastBookingDays: "90" })).toBe("lastBookingDays : 90 (non évalué)");
    expect(describeCriteria({ membershipType: "vip", lastBookingDays: "90" })).toBe("Palier : VIP · lastBookingDays : 90 (non évalué)");
  });

  it("counts the company's loyalty accounts that match, case-insensitively, ignoring unknown keys", () => {
    const s = getStore();
    const account = s.loyaltyAccounts[0]!;
    const base = { id: "x", companyId: account.companyId, campaignId: null, name: "t", estimatedSize: 0, createdAt: NOW.toISOString() };
    const mine = s.loyaltyAccounts.filter((a) => a.companyId === account.companyId);
    expect(eligibleCount({ ...base, criteria: {} })).toBe(mine.length);
    expect(eligibleCount({ ...base, criteria: { lastBookingDays: "90" } })).toBe(mine.length);
    for (const tier of ["REGULAR", "VIP", "PREMIUM"] as const) {
      const expected = mine.filter((a) => a.membershipType === tier).length;
      expect(eligibleCount({ ...base, criteria: { membershipType: tier.toLowerCase() } })).toBe(expected);
      expect(eligibleCount({ ...base, criteria: { membershipType: tier } })).toBe(expected);
    }
    expect(eligibleCount({ ...base, criteria: { membershipType: "gold" } })).toBe(0);
    expect(eligibleCount({ ...base, companyId: "00000000-0000-4000-8000-000000000000", criteria: {} })).toBe(0);
  });
});

describe("notification list", () => {
  it("lists every notification newest first and filters by company, channel and status", () => {
    const s = getStore();
    const all = notificationsRepo.listRows({});
    expect(all).toHaveLength(s.notifications.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const companyId = s.notifications[0]!.companyId;
    expect(notificationsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
    const sms = notificationsRepo.listRows({ channel: "SMS" });
    expect(sms.length).toBeGreaterThan(0);
    expect(sms.every((r) => r.channel === "SMS")).toBe(true);
    const failed = notificationsRepo.listRows({ status: "FAILED" });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((r) => r.status === "FAILED")).toBe(true);
    const both = notificationsRepo.listRows({ channel: "EMAIL", status: "FAILED" });
    expect(both.length).toBe(failed.length);
    expect(notificationsRepo.listRows({ channel: "SMS", status: "FAILED" })).toHaveLength(0);
  });

  it("exposes only client-safe fields: no content, no account identifier", () => {
    const rows = notificationsRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "channel", "companyId", "companyName", "createdAt", "entityType", "id", "notificationCode", "notificationType",
      "read", "recipientLabel", "sentAt", "status",
    ]);
    const text = JSON.stringify(rows);
    const sample = getStore().notifications[0]!;
    expect(text).not.toContain(sample.messageContent);
    expect(text).not.toContain(sample.sentTo ?? "no-account");
  });

  it("labels the recipient with the account name, or says there is no account", () => {
    const s = getStore();
    const withAccount = s.notifications.find((n) => n.sentTo)!;
    const row = notificationsRepo.listRows({}).find((r) => r.id === withAccount.id)!;
    expect(row.recipientLabel).toBe(s.users.find((u) => u.id === withAccount.sentTo)!.displayName);
    const without = s.notifications.find((n) => n.sentTo === null)!;
    expect(notificationsRepo.listRows({}).find((r) => r.id === without.id)!.recipientLabel).toBe("Destinataire sans compte");
  });

  it("counts sent, failed and pending notifications, optionally for one company", () => {
    const s = getStore();
    const stats = notificationsRepo.stats({});
    expect(stats).toEqual({
      sent: s.notifications.filter((n) => n.status === "SENT").length,
      failed: s.notifications.filter((n) => n.status === "FAILED").length,
      pending: s.notifications.filter((n) => n.status === "PENDING").length,
    });
    const companyId = s.notifications[0]!.companyId;
    const mine = notificationsRepo.stats({ companyId });
    expect(mine.sent + mine.failed + mine.pending).toBe(s.notifications.filter((n) => n.companyId === companyId).length);
  });
});

describe("notification detail", () => {
  it("returns undefined for an unknown notification", () => {
    expect(notificationsRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
  });

  it("links a booking notification to its booking and its recipient account", () => {
    const s = getStore();
    const n = s.notifications.find((x) => x.entityType === "booking")!;
    const d = notificationsRepo.detail(n.id)!;
    const booking = s.bookings.find((b) => b.id === n.entityId)!;
    expect(d.entity).toEqual({ href: `/ventes/reservations/${booking.id}`, label: booking.bookingCode });
    expect(d.recipientUserId).toBe(n.sentTo);
    expect(d.recipientName).toBe(s.users.find((u) => u.id === n.sentTo)!.displayName);
    expect(d.companyName).not.toBe("—");
  });

  it("resolves parcel, review and marketing notifications to their pages", () => {
    const s = getStore();
    const parcel = s.notifications.find((x) => x.entityType === "parcel")!;
    expect(notificationsRepo.detail(parcel.id)!.entity!.href).toBe(`/colis/${parcel.entityId}`);
    expect(notificationsRepo.detail(parcel.id)!.recipientUserId).toBeNull();
    expect(notificationsRepo.detail(parcel.id)!.recipientName).toBe("Destinataire sans compte");
    const feedback = s.notifications.find((x) => x.entityType === "feedback")!;
    expect(notificationsRepo.detail(feedback.id)!.entity!.href).toBe(`/clients/avis/${feedback.entityId}`);
    const marketing = s.notifications.find((x) => x.entityType === "marketing_schedule")!;
    const schedule = s.marketingSchedules.find((x) => x.id === marketing.entityId)!;
    expect(notificationsRepo.detail(marketing.id)!.entity!.href).toBe(`/communication/campagnes/${schedule.campaignId}`);
  });
});

describe("campaigns", () => {
  it("lists campaigns newest first with their schedule count and filters by company and status", () => {
    const s = getStore();
    const all = campaignsRepo.listRows({});
    expect(all).toHaveLength(s.marketingCampaigns.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const tabaski = all.find((r) => r.name === "Offre de la Tabaski")!;
    expect(tabaski.scheduleCount).toBe(2);
    expect(Object.keys(tabaski).sort()).toEqual([
      "budget", "companyId", "companyName", "createdAt", "currency", "endDate", "id", "name", "objective",
      "scheduleCount", "startDate", "status",
    ]);
    const cancelled = campaignsRepo.listRows({ status: "CANCELLED" });
    expect(cancelled.length).toBe(4);
    expect(cancelled.every((r) => r.status === "CANCELLED")).toBe(true);
    const companyId = s.marketingCampaigns[0]!.companyId;
    expect(campaignsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
  });

  it("returns undefined for an unknown campaign and a full detail for a known one", () => {
    expect(campaignsRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
    const target = campaignNamed("Offre de la Tabaski");
    const d = campaignsRepo.detail(target.id)!;
    expect(d.companyName).not.toBe("—");
    expect(d.segments.map((x) => x.name)).toHaveLength(1);
    expect(d.messages).toHaveLength(1);
    expect(d.messages[0]!.content).toBe("Profitez de -20 % sur votre prochain trajet.");
    expect(d.schedules.map((x) => x.status).sort()).toEqual(["PENDING", "SENT"]);
    expect(d.cancelBlockedReason).toBeNull();
  });

  it("explains when a campaign cannot be cancelled", () => {
    expect(campaignCancelBlockReason(campaignNamed("Offre de la Tabaski"))).toBeNull();
    expect(campaignCancelBlockReason(campaignNamed("Offre de fin d'année"))).toBeNull();
    expect(campaignCancelBlockReason(campaignNamed("Campagne d'été annulée"))).toBe("Cette campagne est déjà annulée");
    expect(campaignCancelBlockReason(campaignNamed("Bilan de rentrée")))
      .toBe("Une campagne en cours ou terminée ne peut pas être annulée");
    const running = { ...campaignNamed("Offre de la Tabaski"), status: "RUNNING" as const };
    expect(campaignCancelBlockReason(running)).toBe("Une campagne en cours ou terminée ne peut pas être annulée");
    expect(campaignsRepo.detail(campaignNamed("Bilan de rentrée").id)!.cancelBlockedReason)
      .toBe("Une campagne en cours ou terminée ne peut pas être annulée");
  });
});

describe("segments, messages and schedules", () => {
  it("lists segments with their readable targeting and the eligible accounts today", () => {
    const s = getStore();
    const rows = segmentsRepo.listRows({});
    expect(rows).toHaveLength(s.marketingSegments.length);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "campaignName", "companyId", "companyName", "createdAt", "criteriaLabel", "eligibleNow", "estimatedSize", "id", "name",
    ]);
    const vip = rows.find((r) => r.criteriaLabel === "Palier : VIP")!;
    const seg = s.marketingSegments.find((x) => x.id === vip.id)!;
    expect(vip.eligibleNow).toBe(eligibleCount(seg));
    expect(rows.some((r) => r.criteriaLabel === "Tous les clients")).toBe(true);
    expect(rows.find((r) => r.criteriaLabel.startsWith("Palier inconnu"))!.eligibleNow).toBe(0);
    expect(rows.find((r) => r.name.startsWith("Nouveaux clients"))!.campaignName).toBeNull();
    const companyId = s.marketingSegments[0]!.companyId;
    expect(segmentsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
  });

  it("lists messages with their campaign and filters by status", () => {
    const rows = messagesRepo.listRows({});
    expect(rows).toHaveLength(getStore().marketingMessages.length);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "campaignId", "campaignName", "channel", "companyId", "companyName", "content", "createdAt", "id", "status", "subject",
    ]);
    const drafts = messagesRepo.listRows({ status: "DRAFT" });
    expect(drafts.length).toBeGreaterThan(0);
    expect(drafts.every((r) => r.status === "DRAFT" && r.channel === "EMAIL")).toBe(true);
  });

  it("lists schedules by planned date, flags which can be cancelled and filters by status", () => {
    const s = getStore();
    const rows = schedulesRepo.listRows({});
    expect(rows).toHaveLength(s.marketingSchedules.length);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.scheduledAt >= rows[i]!.scheduledAt).toBe(true);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "campaignId", "campaignName", "cancellable", "channel", "companyId", "companyName", "id", "messageSubject",
      "recipientsCount", "scheduledAt", "segmentName", "sentAt", "status",
    ]);
    for (const r of rows) expect(r.cancellable).toBe(r.status !== "CANCELLED");
    const pending = schedulesRepo.listRows({ status: "PENDING" });
    expect(pending.length).toBeGreaterThan(0);
    expect(pending.every((r) => r.status === "PENDING")).toBe(true);
  });
});
