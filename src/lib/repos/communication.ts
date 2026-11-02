import { getStore } from "@/lib/repos/store";
import type {
  AppNotification, CampaignObjective, CampaignStatus, MarketingCampaign, MarketingMessage, MarketingMessageStatus,
  MarketingSchedule, MarketingSegment,
  NotificationChannel, NotificationStatus, ScheduleStatus,
} from "@/lib/types";

export const NOTIFICATION_CHANNELS = ["EMAIL", "SMS", "IN_APP", "PUSH", "WHATSAPP"] as const;
export const NOTIFICATION_STATUSES = ["PENDING", "SENT", "FAILED"] as const;
export const CAMPAIGN_STATUSES = ["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "CANCELLED"] as const;
export const MESSAGE_STATUSES = ["DRAFT", "APPROVED", "SENT"] as const;
export const SCHEDULE_STATUSES = ["PENDING", "SENT", "FAILED", "CANCELLED"] as const;

const KNOWN_TIERS = ["REGULAR", "VIP", "PREMIUM"];

/** Client-safe projection of a notification: no content, no account identifier. */
export interface NotificationRow {
  id: string; notificationCode: string; companyId: string; companyName: string; notificationType: string;
  entityType: string; recipientLabel: string; channel: NotificationChannel; status: NotificationStatus;
  read: boolean; createdAt: string; sentAt: string | null;
}

export interface NotificationStats { sent: number; failed: number; pending: number }

export interface NotificationDetail {
  notification: AppNotification;
  companyName: string;
  recipientName: string;
  recipientUserId: string | null;
  entity: { href: string; label: string } | null;
}

export interface CampaignRow {
  id: string; companyId: string; companyName: string; name: string; objective: CampaignObjective;
  status: CampaignStatus; startDate: string; endDate: string; budget: number; currency: string;
  scheduleCount: number; createdAt: string;
}

export interface SegmentRow {
  id: string; companyId: string; companyName: string; campaignName: string | null; name: string;
  criteriaLabel: string; estimatedSize: number; eligibleNow: number; createdAt: string;
}

export interface MessageRow {
  id: string; companyId: string; companyName: string; campaignId: string; campaignName: string;
  channel: NotificationChannel; subject: string; content: string; status: MarketingMessageStatus; createdAt: string;
}

export interface ScheduleRow {
  id: string; companyId: string; companyName: string; campaignId: string; campaignName: string;
  messageSubject: string; channel: NotificationChannel; segmentName: string; scheduledAt: string;
  sentAt: string | null; status: ScheduleStatus; recipientsCount: number;
  /** False once cancelled: every other status still shows the button (the server refuses what it must). */
  cancellable: boolean;
}

export interface CampaignDetail {
  campaign: MarketingCampaign;
  companyName: string;
  createdByName: string;
  segments: SegmentRow[];
  messages: MessageRow[];
  schedules: ScheduleRow[];
  cancelBlockedReason: string | null;
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

const newest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

/** Readable targeting of a segment; only `membershipType` is evaluated by the backend. */
export function describeCriteria(criteria: Record<string, string>): string {
  const parts = Object.entries(criteria).map(([key, value]) =>
    key === "membershipType"
      ? KNOWN_TIERS.includes(value.toUpperCase()) ? `Palier : ${value.toUpperCase()}` : `Palier inconnu « ${value} » (aucun client)`
      : `${key} : ${value} (non évalué)`);
  return parts.length === 0 ? "Tous les clients" : parts.join(" · ");
}

/** Loyalty accounts of the segment's company that its criteria target today. */
export function eligibleCount(segment: MarketingSegment): number {
  const accounts = getStore().loyaltyAccounts.filter((a) => a.companyId === segment.companyId);
  const wanted = segment.criteria.membershipType;
  return wanted === undefined ? accounts.length : accounts.filter((a) => a.membershipType === wanted.toUpperCase()).length;
}

/** Why a campaign cannot be cancelled, `null` when it can. Same order as the cancel guards. */
export function campaignCancelBlockReason(campaign: MarketingCampaign): string | null {
  if (campaign.status === "CANCELLED") return "Cette campagne est déjà annulée";
  if (campaign.status === "RUNNING" || campaign.status === "COMPLETED") {
    return "Une campagne en cours ou terminée ne peut pas être annulée";
  }
  return null;
}

function recipientName(sentTo: string | null): string {
  if (!sentTo) return "Destinataire sans compte";
  return getStore().users.find((u) => u.id === sentTo)?.displayName ?? "Compte supprimé";
}

function notificationRow(n: AppNotification): NotificationRow {
  return {
    id: n.id, notificationCode: n.notificationCode, companyId: n.companyId, companyName: companyName(n.companyId),
    notificationType: n.notificationType, entityType: n.entityType, recipientLabel: recipientName(n.sentTo),
    channel: n.channel, status: n.status, read: n.read, createdAt: n.createdAt, sentAt: n.sentAt,
  };
}

function entityLink(n: AppNotification): { href: string; label: string } | null {
  const s = getStore();
  if (n.entityType === "booking") {
    const b = s.bookings.find((x) => x.id === n.entityId);
    return b ? { href: `/ventes/reservations/${b.id}`, label: b.bookingCode } : null;
  }
  if (n.entityType === "parcel") {
    const p = s.parcels.find((x) => x.id === n.entityId);
    return p ? { href: `/colis/${p.id}`, label: p.parcelCode } : null;
  }
  if (n.entityType === "feedback") {
    const f = s.feedbacks.find((x) => x.id === n.entityId);
    return f ? { href: `/clients/avis/${f.id}`, label: f.title } : null;
  }
  if (n.entityType === "marketing_schedule") {
    const sc = s.marketingSchedules.find((x) => x.id === n.entityId);
    const c = sc ? s.marketingCampaigns.find((x) => x.id === sc.campaignId) : undefined;
    return c ? { href: `/communication/campagnes/${c.id}`, label: c.name } : null;
  }
  return null;
}

function segmentRow(seg: MarketingSegment): SegmentRow {
  return {
    id: seg.id, companyId: seg.companyId, companyName: companyName(seg.companyId),
    campaignName: seg.campaignId ? getStore().marketingCampaigns.find((c) => c.id === seg.campaignId)?.name ?? null : null,
    name: seg.name, criteriaLabel: describeCriteria(seg.criteria), estimatedSize: seg.estimatedSize,
    eligibleNow: eligibleCount(seg), createdAt: seg.createdAt,
  };
}

function messageRow(m: MarketingMessage): MessageRow {
  return {
    id: m.id, companyId: m.companyId, companyName: companyName(m.companyId), campaignId: m.campaignId,
    campaignName: getStore().marketingCampaigns.find((c) => c.id === m.campaignId)?.name ?? "—",
    channel: m.channel, subject: m.subject, content: m.content, status: m.status, createdAt: m.createdAt,
  };
}

function scheduleRow(sc: MarketingSchedule): ScheduleRow {
  const s = getStore();
  const message = s.marketingMessages.find((m) => m.id === sc.messageId);
  return {
    id: sc.id, companyId: sc.companyId, companyName: companyName(sc.companyId), campaignId: sc.campaignId,
    campaignName: s.marketingCampaigns.find((c) => c.id === sc.campaignId)?.name ?? "—",
    messageSubject: message?.subject ?? "—", channel: message?.channel ?? "IN_APP",
    segmentName: s.marketingSegments.find((x) => x.id === sc.segmentId)?.name ?? "—",
    scheduledAt: sc.scheduledAt, sentAt: sc.sentAt, status: sc.status, recipientsCount: sc.recipientsCount,
    cancellable: sc.status !== "CANCELLED",
  };
}

export const notificationsRepo = {
  listRows(filter: { companyId?: string; channel?: NotificationChannel; status?: NotificationStatus } = {}): NotificationRow[] {
    return getStore().notifications
      .filter((n) =>
        (!filter.companyId || n.companyId === filter.companyId) &&
        (!filter.channel || n.channel === filter.channel) &&
        (!filter.status || n.status === filter.status))
      .sort(newest((n) => n.createdAt))
      .map(notificationRow);
  },

  get(id: string): AppNotification | undefined {
    return getStore().notifications.find((n) => n.id === id);
  },

  stats(filter: { companyId?: string } = {}): NotificationStats {
    const list = getStore().notifications.filter((n) => !filter.companyId || n.companyId === filter.companyId);
    return {
      sent: list.filter((n) => n.status === "SENT").length,
      failed: list.filter((n) => n.status === "FAILED").length,
      pending: list.filter((n) => n.status === "PENDING").length,
    };
  },

  detail(id: string): NotificationDetail | undefined {
    const n = getStore().notifications.find((x) => x.id === id);
    if (!n) return undefined;
    return {
      notification: n, companyName: companyName(n.companyId), recipientName: recipientName(n.sentTo),
      recipientUserId: n.sentTo, entity: entityLink(n),
    };
  },
};

export const campaignsRepo = {
  listRows(filter: { companyId?: string; status?: CampaignStatus } = {}): CampaignRow[] {
    const s = getStore();
    return s.marketingCampaigns
      .filter((c) => (!filter.companyId || c.companyId === filter.companyId) && (!filter.status || c.status === filter.status))
      .sort(newest((c) => c.createdAt))
      .map((c): CampaignRow => ({
        id: c.id, companyId: c.companyId, companyName: companyName(c.companyId), name: c.name, objective: c.objective,
        status: c.status, startDate: c.startDate, endDate: c.endDate, budget: c.budget, currency: c.currency,
        scheduleCount: s.marketingSchedules.filter((x) => x.campaignId === c.id).length, createdAt: c.createdAt,
      }));
  },

  get(id: string): MarketingCampaign | undefined {
    return getStore().marketingCampaigns.find((c) => c.id === id);
  },

  detail(id: string): CampaignDetail | undefined {
    const s = getStore();
    const campaign = s.marketingCampaigns.find((c) => c.id === id);
    if (!campaign) return undefined;
    return {
      campaign, companyName: companyName(campaign.companyId),
      createdByName: s.users.find((u) => u.id === campaign.createdByUserId)?.displayName ?? "—",
      segments: s.marketingSegments.filter((x) => x.campaignId === id).map(segmentRow),
      messages: s.marketingMessages.filter((m) => m.campaignId === id).map(messageRow),
      schedules: s.marketingSchedules.filter((x) => x.campaignId === id).sort(newest((x) => x.scheduledAt)).map(scheduleRow),
      cancelBlockedReason: campaignCancelBlockReason(campaign),
    };
  },
};

export const segmentsRepo = {
  listRows(filter: { companyId?: string } = {}): SegmentRow[] {
    return getStore().marketingSegments
      .filter((x) => !filter.companyId || x.companyId === filter.companyId)
      .sort((a, b) => companyName(a.companyId).localeCompare(companyName(b.companyId)) || a.name.localeCompare(b.name))
      .map(segmentRow);
  },
};

export const messagesRepo = {
  listRows(filter: { companyId?: string; status?: MarketingMessageStatus } = {}): MessageRow[] {
    return getStore().marketingMessages
      .filter((m) => (!filter.companyId || m.companyId === filter.companyId) && (!filter.status || m.status === filter.status))
      .sort(newest((m) => m.createdAt))
      .map(messageRow);
  },
};

export const schedulesRepo = {
  listRows(filter: { companyId?: string; status?: ScheduleStatus } = {}): ScheduleRow[] {
    return getStore().marketingSchedules
      .filter((x) => (!filter.companyId || x.companyId === filter.companyId) && (!filter.status || x.status === filter.status))
      .sort(newest((x) => x.scheduledAt))
      .map(scheduleRow);
  },
};
