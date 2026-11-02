import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const ofType = (type: string) => getStore().notifications.filter((n) => n.notificationType === type);

describe("notifications seed: shape", () => {
  it("generates unique, well-formed codes and ids", () => {
    const list = getStore().notifications;
    expect(list.length).toBeGreaterThan(300);
    expect(new Set(list.map((n) => n.id)).size).toBe(list.length);
    expect(new Set(list.map((n) => n.notificationCode)).size).toBe(list.length);
    for (const n of list) expect(n.notificationCode).toMatch(/^NTF-[0-9A-Z]{8}$/);
  });

  it("covers the three statuses and the three channels it uses", () => {
    const list = getStore().notifications;
    expect(new Set(list.map((n) => n.status))).toEqual(new Set(["PENDING", "SENT", "FAILED"]));
    expect(new Set(list.map((n) => n.channel))).toEqual(new Set(["EMAIL", "SMS", "IN_APP"]));
    for (const n of list) {
      if (n.status === "FAILED") expect(n.channel).toBe("EMAIL");
      if (n.status === "PENDING") expect(n.channel).toBe("SMS");
      expect(n.sentAt === null).toBe(n.status !== "SENT");
      expect(n.retryCount).toBe(0);
    }
  });

  it("only marks sent in-app notifications as read, and never dates a notification in the future", () => {
    for (const n of getStore().notifications) {
      if (n.read) {
        expect(n.channel).toBe("IN_APP");
        expect(n.status).toBe("SENT");
      }
      expect(Date.parse(n.createdAt)).toBeLessThanOrEqual(NOW.getTime());
      if (n.sentAt) expect(Date.parse(n.sentAt)).toBeGreaterThan(Date.parse(n.createdAt));
    }
    expect(getStore().notifications.some((n) => n.read)).toBe(true);
    expect(getStore().notifications.some((n) => n.channel === "IN_APP" && n.status === "SENT" && !n.read)).toBe(true);
  });

  it("holds no e-mail address and no phone number, content included", () => {
    expect(JSON.stringify(getStore().notifications)).not.toMatch(/@|\+221/);
  });
});

describe("notifications seed: derivation", () => {
  it("sends three booking_confirmed notifications per online booking with an account", () => {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online" && b.userId);
    expect(ofType("booking_confirmed")).toHaveLength(online.length * 3);
    for (const b of online) {
      const mine = s.notifications.filter((n) => n.entityId === b.id && n.notificationType === "booking_confirmed");
      expect(mine.map((n) => n.channel).sort()).toEqual(["EMAIL", "IN_APP", "SMS"]);
      for (const n of mine) {
        expect([n.entityType, n.companyId, n.sentTo]).toEqual(["booking", b.companyId, b.userId]);
        expect(n.messageContent).toContain(b.bookingCode);
      }
    }
  });

  it("sends one payment_completed per paid online booking and booking_cancelled only for non-expired cancellations", () => {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online" && b.userId);
    expect(ofType("payment_completed")).toHaveLength(online.filter((b) => b.paymentStatus === "paid").length);
    for (const n of ofType("payment_completed")) expect(n.channel).toBe("IN_APP");
    const cancelled = online.filter((b) => b.status === "cancelled" && b.cancelReason !== "EXPIRED");
    expect(cancelled.length).toBeGreaterThan(0);
    expect(ofType("booking_cancelled")).toHaveLength(cancelled.length * 3);
    const expired = online.filter((b) => b.cancelReason === "EXPIRED");
    expect(expired.length).toBeGreaterThan(0);
    for (const b of expired) {
      expect(s.notifications.some((n) => n.entityId === b.id && n.notificationType === "booking_cancelled")).toBe(false);
    }
  });

  it("sends one SMS per parcel history line to a recipient without an account", () => {
    const s = getStore();
    const sms = s.notifications.filter((n) => n.entityType === "parcel");
    expect(sms).toHaveLength(s.parcelHistory.length);
    for (const n of sms) {
      expect(n.channel).toBe("SMS");
      expect(n.sentTo).toBeNull();
      expect(n.notificationType).toMatch(/^parcel_(created|status_[a-z_]+)$/);
      const parcel = s.parcels.find((p) => p.id === n.entityId)!;
      expect(n.companyId).toBe(parcel.companyId);
      expect(n.messageContent).toContain(parcel.parcelCode);
    }
    expect(new Set(sms.map((n) => n.notificationType)).size).toBeGreaterThan(3);
  });

  it("answers each resolved review with one in-app notification to its author", () => {
    const s = getStore();
    const resolved = s.feedbacks.filter((f) => f.status === "RESOLVED");
    expect(resolved.length).toBeGreaterThan(0);
    expect(ofType("feedback_response")).toHaveLength(resolved.length);
    for (const f of resolved) {
      const n = s.notifications.find((x) => x.entityId === f.id)!;
      expect(n.channel).toBe("IN_APP");
      expect(n.sentTo).toBe(s.customers.find((c) => c.id === f.customerId)!.userId);
      expect(n.createdAt).toBe(f.respondedAt);
    }
  });

  it("delivers each sent schedule to every eligible account, with the message text, and nothing for the other schedules", () => {
    const s = getStore();
    const marketing = ofType("marketing_message");
    let expected = 0;
    for (const sc of s.marketingSchedules) {
      const mine = marketing.filter((n) => n.entityId === sc.id);
      if (sc.status !== "SENT") { expect(mine).toHaveLength(0); continue; }
      expect(mine).toHaveLength(sc.recipientsCount);
      expected += sc.recipientsCount;
      const message = s.marketingMessages.find((m) => m.id === sc.messageId)!;
      for (const n of mine) {
        expect([n.entityType, n.channel, n.createdAt, n.messageContent]).toEqual(["marketing_schedule", "IN_APP", sc.sentAt, message.content]);
        expect(n.companyId).toBe(sc.companyId);
      }
    }
    expect(marketing).toHaveLength(expected);
    expect(expected).toBeGreaterThan(0);
  });

  it("only addresses existing accounts", () => {
    const s = getStore();
    const users = new Set(s.users.map((u) => u.id));
    for (const n of s.notifications) if (n.sentTo) expect(users.has(n.sentTo)).toBe(true);
  });
});
