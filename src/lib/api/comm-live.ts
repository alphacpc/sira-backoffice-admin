import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { arr, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import { ApiError } from "@/lib/api/http";
import {
  CAMPAIGN_STATUSES, describeCriteria, MESSAGE_STATUSES, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, SCHEDULE_STATUSES,
  type CampaignRow, type MessageRow, type NotificationRow, type ScheduleRow, type SegmentRow,
} from "@/lib/repos/communication";
import { fold, type CommOverview, type CommTab } from "@/lib/repos/communication-hub";
import type { CampaignObjective, NotificationChannel } from "@/lib/types";

const OBJECTIVES = ["ACQUISITION", "RETENTION", "PROMOTION", "REACTIVATION"] as const;
type Names = Map<string, string>;
const nameOf = (names: Names, id: string) => names.get(id) ?? "—";

/** Notification list row: the platform never sends the content, so there is nothing to mask here. */
export function toNotificationRow(raw: unknown): NotificationRow {
  const n = obj(raw);
  return {
    id: str(n.id), notificationCode: str(n.notificationCode, "—"), companyId: str(n.companyId), companyName: str(n.companyName, "—"),
    notificationType: str(n.notificationType), entityType: str(n.entityType), recipientLabel: str(n.recipientLabel, "—"),
    channel: pick<NotificationChannel>(n.channel, NOTIFICATION_CHANNELS, true, "IN_APP"),
    status: pick(n.status, NOTIFICATION_STATUSES, true, "PENDING"), read: n.read === true,
    createdAt: str(n.createdAt), sentAt: strOrNull(n.sentAt),
  };
}

// createdByUserId is deliberately not read: it never reaches the client components.
export function toCampaignRow(raw: unknown, names: Names): CampaignRow {
  const c = obj(raw);
  const objective = typeof c.objective === "string" ? c.objective.toUpperCase() : "";
  return {
    id: str(c.id), companyId: str(c.companyId), companyName: nameOf(names, str(c.companyId)), name: str(c.name, "—"),
    objective: (OBJECTIVES as readonly string[]).includes(objective) ? (objective as CampaignObjective) : null,
    status: pick(c.status, CAMPAIGN_STATUSES, true, "DRAFT"), startDate: strOrNull(c.startDate), endDate: strOrNull(c.endDate),
    budget: numOrNull(c.budget), currency: str(c.currency, "XOF"), scheduleCount: num(c.scheduleCount), createdAt: str(c.createdAt),
  };
}

/** `criteria` is a JSON string; anything unreadable gives a neutral label rather than "all customers". */
export function criteriaLabelOf(raw: unknown): string {
  let value: unknown = raw;
  if (typeof raw === "string") {
    try {
      value = JSON.parse(raw);
    } catch {
      return "—";
    }
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) return "—";
  const flat: Record<string, string> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) flat[k] = typeof v === "string" ? v : String(v);
  return describeCriteria(flat);
}

export function toSegmentRow(raw: unknown, names: Names): SegmentRow {
  const s = obj(raw);
  return {
    id: str(s.id), companyId: str(s.companyId), companyName: nameOf(names, str(s.companyId)), campaignName: strOrNull(s.campaignName),
    name: str(s.name, "—"), criteriaLabel: criteriaLabelOf(s.criteria), estimatedSize: numOrNull(s.estimatedSize),
    eligibleNow: num(s.eligibleNow), createdAt: str(s.createdAt),
  };
}

/** The message body is never returned by the platform: `content` stays empty and the card hides it. */
export function toMessageRow(raw: unknown, names: Names): MessageRow {
  const m = obj(raw);
  return {
    id: str(m.id), companyId: str(m.companyId), companyName: nameOf(names, str(m.companyId)), campaignId: str(m.campaignId),
    campaignName: str(m.campaignName, "—"), channel: pick<NotificationChannel>(m.channel, NOTIFICATION_CHANNELS, true, "IN_APP"),
    subject: str(m.subject, "—") || "—", content: "", status: pick(m.status, MESSAGE_STATUSES, true, "DRAFT"), createdAt: str(m.createdAt),
  };
}

export interface ScheduleJoins {
  messages: Map<string, { subject: string; channel: NotificationChannel }>;
  segments: Map<string, string>;
}

export function toScheduleJoins(messages: MessageRow[], segments: SegmentRow[]): ScheduleJoins {
  return {
    messages: new Map(messages.map((m) => [m.id, { subject: m.subject, channel: m.channel }])),
    segments: new Map(segments.map((s) => [s.id, s.name])),
  };
}

/** Subject, channel and segment name are not in the schedule row: they come from the message and segment lists. */
export function toScheduleRow(raw: unknown, names: Names, joins: ScheduleJoins): ScheduleRow {
  const s = obj(raw);
  const message = joins.messages.get(str(s.messageId));
  const status = pick(s.status, SCHEDULE_STATUSES, true, "PENDING");
  return {
    id: str(s.id), companyId: str(s.companyId), companyName: str(s.companyName) || nameOf(names, str(s.companyId)),
    campaignId: str(s.campaignId), campaignName: str(s.campaignName, "—"), messageSubject: message?.subject ?? "—",
    channel: message?.channel ?? null, segmentName: joins.segments.get(str(s.segmentId)) ?? "—", scheduledAt: str(s.scheduledAt),
    sentAt: strOrNull(s.sentAt), status, recipientsCount: num(s.recipientsCount), cancellable: status !== "CANCELLED",
  };
}

/** Defensive conversion of the BFF overview: a missing block stays null so the view hides its card. */
export function toCommOverview(raw: unknown, names: Names, joins: ScheduleJoins): CommOverview {
  const o = obj(raw);
  const n = o.notifications && typeof o.notifications === "object" ? obj(o.notifications) : null;
  return {
    notifications: n
      ? {
          sent: num(n.sent), failed: num(n.failed), pending: num(n.pending), successRate: numOrNull(n.successRate),
          byChannel: arr(n.byChannel).map((c) => ({ channel: pick<NotificationChannel>(c.channel, NOTIFICATION_CHANNELS, true, "IN_APP"), value: num(c.value) })),
          failures: arr(n.failures).map((f) => toNotificationRow({ ...f, recipientLabel: "—" })),
        }
      : null,
    pipeline: Array.isArray(o.pipeline)
      ? CAMPAIGN_STATUSES.map((status) => ({ status, value: arr(o.pipeline).filter((p) => str(p.status).toUpperCase() === status).reduce((t, p) => t + num(p.value), 0) }))
      : null,
    upcoming: Array.isArray(o.upcoming) ? arr(o.upcoming).map((s) => toScheduleRow(s, names, joins)) : null,
    topCampaigns: Array.isArray(o.topCampaigns)
      ? arr(o.topCampaigns).map((c) => ({ id: str(c.id), name: str(c.name, "—"), companyName: str(c.companyName, "—"), recipients: num(c.recipients), sends: num(c.sends) }))
      : null,
    audience: numOrNull(o.audience), campaigns: numOrNull(o.campaigns),
  };
}

/** Null counter = its source failed, so the tab shows no badge. */
export function toCommCounts(raw: unknown, notifications: number | null): Record<CommTab, number | null> {
  const c = obj(raw);
  return { apercu: 0, notifications, campagnes: numOrNull(c.campagnes), messages: numOrNull(c.messages), segments: numOrNull(c.segments), programmations: numOrNull(c.programmations) };
}

// ---------------------------------------------------------------------------------------------------------

export async function liveCommCounts(q?: string, companyId?: string): Promise<Record<CommTab, number | null>> {
  const [raw, notif] = await Promise.all([
    soft<unknown>(`/admin/communication/counts?${withFilters({ q, companyId })}`),
    soft<unknown>(`/admin/communication/notifications?${withFilters({ q, companyId, size: "1" })}`),
  ]);
  return toCommCounts(raw, notif && typeof notif === "object" ? numOrNull(obj(notif).totalElements) : null);
}

export async function liveNotifications(f: { q?: string; companyId?: string; channel?: string; status?: string }): Promise<NotificationRow[]> {
  return (await loadAll("/admin/communication/notifications", withFilters(f))).map(toNotificationRow);
}

export interface NotificationFigures { sent: number; failed: number; pending: number }
export async function liveNotificationStats(companyId?: string): Promise<NotificationFigures | null> {
  const raw = await soft<unknown>(`/admin/notifications/stats?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  return { sent: num(s.sent), failed: num(s.failed), pending: num(s.pending) };
}

export async function liveCampaigns(f: { q?: string; companyId?: string; status?: string }): Promise<CampaignRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/marketing-campaigns", withFilters(f)), companyNames()]);
  return rows.map((r) => toCampaignRow(r, n));
}

export interface CampaignFigures { total: number; running: number; scheduled: number; completed: number }
export async function liveCampaignStats(companyId?: string): Promise<CampaignFigures | null> {
  const raw = await soft<unknown>(`/admin/marketing-campaigns/stats?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  return { total: num(s.total), running: num(s.running), scheduled: num(s.scheduled), completed: num(s.completed) };
}

export async function liveMessages(f: { q?: string; companyId?: string; status?: string }): Promise<MessageRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/marketing-messages", withFilters(f)), companyNames()]);
  return rows.map((r) => toMessageRow(r, n));
}

export async function liveSegments(f: { q?: string; companyId?: string }): Promise<SegmentRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/marketing-segments", withFilters(f)), companyNames()]);
  return rows.map((r) => toSegmentRow(r, n));
}

export interface SegmentFigures { count: number; estimatedSizeTotal: number; eligibleNowTotal: number; reusableCount: number }
export async function liveSegmentStats(companyId?: string): Promise<SegmentFigures | null> {
  const raw = await soft<unknown>(`/admin/marketing-segments/stats?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  return { count: num(s.count), estimatedSizeTotal: num(s.estimatedSizeTotal), eligibleNowTotal: num(s.eligibleNowTotal), reusableCount: num(s.reusableCount) };
}

/** Schedules joined with the message and segment lists; the search runs here because subject and segment are not server-side. */
export async function liveSchedules(f: { q?: string; companyId?: string; status?: string }): Promise<ScheduleRow[]> {
  const [rows, n, messages, segments] = await Promise.all([
    loadAll("/admin/marketing-schedules", withFilters({ companyId: f.companyId, status: f.status })), companyNames(),
    liveMessages({ companyId: f.companyId }), liveSegments({ companyId: f.companyId }),
  ]);
  const joins = toScheduleJoins(messages, segments);
  const all = rows.map((r) => toScheduleRow(r, n, joins));
  const q = fold((f.q ?? "").trim());
  if (!q) return all;
  return all.filter((s) => [s.campaignName, s.messageSubject, s.companyName, s.segmentName].some((x) => fold(x).includes(q)));
}

export interface ScheduleFigures { total: number; pending: number; sent: number; failed: number }
export async function liveScheduleStats(companyId?: string): Promise<ScheduleFigures | null> {
  const raw = await soft<unknown>(`/admin/marketing-schedules/stats?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  return { total: num(s.total), pending: num(s.pending), sent: num(s.sent), failed: num(s.failed) };
}

export async function liveCommOverview(companyId?: string): Promise<CommOverview> {
  const [raw, n, messages, segments] = await Promise.all([
    soft<unknown>(`/admin/communication/overview?${withFilters({ companyId })}`), companyNames(),
    liveMessages({ companyId }).catch(softError), liveSegments({ companyId }).catch(softError),
  ]);
  return toCommOverview(raw, n, toScheduleJoins(messages, segments));
}

/** Join data is optional on the overview: a failing source gives empty joins (labels fall back to "—"); auth errors still redirect. */
function softError(e: unknown): never[] {
  if (e instanceof ApiError) return [];
  throw e;
}
