import {
  campaignsRepo, messagesRepo, notificationsRepo, schedulesRepo, segmentsRepo,
  type CampaignRow, type MessageRow, type NotificationRow, type ScheduleRow, type SegmentRow,
} from "@/lib/repos/communication";
import type { CampaignStatus, MarketingMessageStatus, NotificationChannel, NotificationStatus, ScheduleStatus } from "@/lib/types";

export const COMM_TABS = ["apercu", "notifications", "campagnes", "messages", "segments", "programmations"] as const;
export type CommTab = (typeof COMM_TABS)[number];

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}
type Co = { companyId?: string };

/** Live mode: a null block means its source failed, and the view hides the card instead of showing a misleading zero. */
export interface CommOverview {
  notifications: { sent: number; failed: number; pending: number; successRate: number | null; byChannel: { channel: NotificationChannel; value: number }[]; failures: NotificationRow[] } | null;
  pipeline: { status: CampaignStatus; value: number }[] | null;
  upcoming: ScheduleRow[] | null;
  topCampaigns: { id: string; name: string; companyName: string; recipients: number; sends: number }[] | null;
  audience: number | null;
  campaigns: number | null;
}

export const commHubRepo = {
  notifications(q?: string, f: Co & { channel?: NotificationChannel; status?: NotificationStatus } = {}): NotificationRow[] {
    const hit = matcher(q);
    return notificationsRepo.listRows(f).filter((n) => hit(n.notificationCode, n.recipientLabel, n.companyName, n.notificationType));
  },
  campaigns(q?: string, f: Co & { status?: CampaignStatus } = {}): CampaignRow[] {
    const hit = matcher(q);
    return campaignsRepo.listRows(f).filter((c) => hit(c.name, c.companyName, c.objective));
  },
  messages(q?: string, f: Co & { status?: MarketingMessageStatus } = {}): MessageRow[] {
    const hit = matcher(q);
    return messagesRepo.listRows(f).filter((m) => hit(m.subject, m.campaignName, m.companyName, m.content));
  },
  segments(q?: string, f: Co = {}): SegmentRow[] {
    const hit = matcher(q);
    return segmentsRepo.listRows(f).filter((s) => hit(s.name, s.companyName, s.campaignName, s.criteriaLabel));
  },
  schedules(q?: string, f: Co & { status?: ScheduleStatus } = {}): ScheduleRow[] {
    const hit = matcher(q);
    return schedulesRepo.listRows(f).filter((s) => hit(s.campaignName, s.messageSubject, s.companyName, s.segmentName));
  },

  counts(q?: string, f: Co = {}): Record<CommTab, number> {
    return {
      apercu: 0, notifications: commHubRepo.notifications(q, f).length, campagnes: commHubRepo.campaigns(q, f).length,
      messages: commHubRepo.messages(q, f).length, segments: commHubRepo.segments(q, f).length,
      programmations: commHubRepo.schedules(q, f).length,
    };
  },

  overview(f: Co = {}): CommOverview {
    const stats = notificationsRepo.stats(f);
    const all = notificationsRepo.listRows(f);
    const channels = new Map<NotificationChannel, number>();
    for (const n of all) channels.set(n.channel, (channels.get(n.channel) ?? 0) + 1);
    const campaigns = campaignsRepo.listRows(f);
    const schedules = schedulesRepo.listRows(f);
    const top = new Map<string, { id: string; name: string; companyName: string; recipients: number; sends: number }>();
    for (const s of schedules.filter((x) => x.status === "SENT")) {
      const cur = top.get(s.campaignId) ?? { id: s.campaignId, name: s.campaignName, companyName: s.companyName, recipients: 0, sends: 0 };
      cur.recipients += s.recipientsCount;
      cur.sends += 1;
      top.set(s.campaignId, cur);
    }
    return {
      notifications: {
        ...stats, successRate: stats.sent + stats.failed ? Math.round((stats.sent / (stats.sent + stats.failed)) * 100) : null,
        byChannel: [...channels.entries()].map(([channel, value]) => ({ channel, value })).sort((a, b) => b.value - a.value),
        failures: all.filter((n) => n.status === "FAILED").slice(0, 4),
      },
      pipeline: (["DRAFT", "SCHEDULED", "RUNNING", "COMPLETED", "CANCELLED"] as const).map((status) => ({ status, value: campaigns.filter((c) => c.status === status).length })),
      upcoming: schedules.filter((s) => s.status === "PENDING").sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt)).slice(0, 5),
      topCampaigns: [...top.values()].sort((a, b) => b.recipients - a.recipients).slice(0, 5),
      audience: segmentsRepo.listRows(f).reduce((n, s) => n + s.eligibleNow, 0), campaigns: campaigns.length,
    };
  },
};
