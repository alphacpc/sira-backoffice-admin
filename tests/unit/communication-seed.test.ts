import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const campaignNamed = (name: string) => {
  const found = getStore().marketingCampaigns.filter((c) => c.name === name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
};
const schedulesOf = (campaignId: string) => getStore().marketingSchedules.filter((s) => s.campaignId === campaignId);

describe("marketing seed: references", () => {
  it("creates campaigns only for the first four companies with an active loyalty program", () => {
    const s = getStore();
    const expected = s.loyaltyPrograms.filter((p) => p.status === "ACTIVE").slice(0, 4).map((p) => p.companyId);
    expect(expected).toHaveLength(4);
    expect(new Set(s.marketingCampaigns.map((c) => c.companyId))).toEqual(new Set(expected));
    expect(s.marketingCampaigns).toHaveLength(13);
  });

  it("keeps every segment, message and schedule inside the company of its campaign", () => {
    const s = getStore();
    const campaigns = new Map(s.marketingCampaigns.map((c) => [c.id, c]));
    for (const m of s.marketingMessages) expect(campaigns.get(m.campaignId)!.companyId).toBe(m.companyId);
    for (const seg of s.marketingSegments) {
      if (seg.campaignId) expect(campaigns.get(seg.campaignId)!.companyId).toBe(seg.companyId);
    }
    for (const sc of s.marketingSchedules) {
      const campaign = campaigns.get(sc.campaignId)!;
      expect(campaign.companyId).toBe(sc.companyId);
      const message = s.marketingMessages.find((m) => m.id === sc.messageId)!;
      const segment = s.marketingSegments.find((x) => x.id === sc.segmentId)!;
      expect(message.campaignId).toBe(sc.campaignId);
      expect(segment.companyId).toBe(sc.companyId);
    }
  });

  it("has unique ids and unique campaign names", () => {
    const s = getStore();
    for (const list of [s.marketingCampaigns, s.marketingSegments, s.marketingMessages, s.marketingSchedules]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
    expect(new Set(s.marketingCampaigns.map((c) => c.name)).size).toBe(s.marketingCampaigns.length);
  });

  it("names the author with a platform account of the company when there is one", () => {
    const s = getStore();
    for (const c of s.marketingCampaigns) {
      if (c.createdByUserId) expect(s.users.find((u) => u.id === c.createdByUserId)!.companyId).toBe(c.companyId);
    }
  });
});

describe("marketing seed: states", () => {
  it("covers the campaign, message and schedule statuses the backend can produce, plus one completed campaign", () => {
    const s = getStore();
    expect(new Set(s.marketingCampaigns.map((c) => c.status))).toEqual(new Set(["DRAFT", "SCHEDULED", "CANCELLED", "COMPLETED"]));
    expect(new Set(s.marketingMessages.map((m) => m.status))).toEqual(new Set(["DRAFT", "APPROVED", "SENT"]));
    expect(new Set(s.marketingSchedules.map((x) => x.status))).toEqual(new Set(["PENDING", "SENT", "CANCELLED"]));
    expect(s.marketingCampaigns.filter((c) => c.status === "COMPLETED")).toHaveLength(1);
  });

  it("gives a cancelled campaign no pending schedule and an update date; the others have none", () => {
    for (const c of getStore().marketingCampaigns) {
      if (c.status === "CANCELLED") {
        expect(schedulesOf(c.id).every((x) => x.status !== "PENDING")).toBe(true);
        expect(c.updatedAt).not.toBeNull();
      } else {
        expect(c.updatedAt).toBeNull();
      }
    }
  });

  it("only schedules approved or sent messages, and sends only in the past", () => {
    const s = getStore();
    for (const sc of s.marketingSchedules) {
      const message = s.marketingMessages.find((m) => m.id === sc.messageId)!;
      expect(["APPROVED", "SENT"]).toContain(message.status);
      expect(message.channel).toBe("IN_APP");
      if (sc.status === "SENT") {
        expect(sc.sentAt).not.toBeNull();
        expect(Date.parse(sc.sentAt!)).toBeLessThan(NOW.getTime());
        expect(Date.parse(sc.sentAt!)).toBeGreaterThan(Date.parse(sc.scheduledAt));
      } else {
        expect(sc.sentAt).toBeNull();
      }
      if (sc.status === "PENDING") expect(Date.parse(sc.scheduledAt)).toBeGreaterThan(NOW.getTime());
    }
  });

  it("keeps drafts out of the schedules", () => {
    const s = getStore();
    for (const m of s.marketingMessages.filter((x) => x.status === "DRAFT")) {
      expect(s.marketingSchedules.some((x) => x.messageId === m.id)).toBe(false);
    }
  });

  it("matches a sent schedule's recipient count to the company's eligible loyalty accounts", () => {
    const s = getStore();
    const sent = s.marketingSchedules.filter((x) => x.status === "SENT");
    expect(sent.length).toBeGreaterThan(3);
    for (const sc of sent) {
      const segment = s.marketingSegments.find((x) => x.id === sc.segmentId)!;
      const accounts = s.loyaltyAccounts.filter((a) => a.companyId === sc.companyId);
      const wanted = segment.criteria.membershipType;
      const expected = wanted === undefined ? accounts.length : accounts.filter((a) => a.membershipType === wanted.toUpperCase()).length;
      expect(sc.recipientsCount).toBe(expected);
    }
    expect(sent.some((x) => x.recipientsCount > 0)).toBe(true);
  });
});

describe("marketing seed: scenarios", () => {
  it("has the four scenario campaigns in the expected states", () => {
    const tabaski = campaignNamed("Offre de la Tabaski");
    expect(tabaski.status).toBe("SCHEDULED");
    expect(schedulesOf(tabaski.id).map((x) => x.status).sort()).toEqual(["PENDING", "SENT"]);

    const yearEnd = campaignNamed("Offre de fin d'année");
    expect(yearEnd.status).toBe("SCHEDULED");
    expect(schedulesOf(yearEnd.id).map((x) => x.status)).toEqual(["PENDING"]);
    const yearEndMessage = getStore().marketingMessages.find((m) => m.campaignId === yearEnd.id)!;
    expect(yearEndMessage.subject).toBe("Offre de fin d'année");

    const done = campaignNamed("Bilan de rentrée");
    expect(done.status).toBe("COMPLETED");
    expect(schedulesOf(done.id).map((x) => x.status)).toEqual(["SENT"]);

    expect(campaignNamed("Campagne d'été annulée").status).toBe("CANCELLED");
  });

  it("targets with a known tier, with every account, and with a tier no one has", () => {
    const criteria = getStore().marketingSegments.map((s) => s.criteria);
    expect(criteria.some((c) => c.membershipType === "vip")).toBe(true);
    expect(criteria.some((c) => Object.keys(c).length === 0)).toBe(true);
    expect(criteria.some((c) => c.membershipType === "gold")).toBe(true);
    expect(criteria.some((c) => c.lastBookingDays !== undefined)).toBe(true);
  });

  it("holds no e-mail address and no phone number", () => {
    const s = getStore();
    expect(JSON.stringify([s.marketingCampaigns, s.marketingSegments, s.marketingMessages, s.marketingSchedules]))
      .not.toMatch(/@|\+221/);
  });
});
