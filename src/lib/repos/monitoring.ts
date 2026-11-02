import { getStore } from "@/lib/repos/store";
import type {
  ApiUsageRow, ImpactScope, IncidentSeverity, IncidentStatus, ServiceHealth, ServiceStatus, SystemIncident,
} from "@/lib/types";

/** A service whose last check precedes the most recent check of all services by more than this is stale. */
export const STALE_AFTER_MS = 90_000;
export const INCIDENT_STATUSES = ["INVESTIGATING", "IDENTIFIED", "MONITORING", "RESOLVED"] as const;
export const INCIDENT_SEVERITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export const IMPACT_SCOPES = ["SINGLE_COMPANY", "MULTI_COMPANY", "PLATFORM_WIDE"] as const;
export const API_WINDOWS = [7, 14, 30] as const;

const HOUR = 3_600_000;
const DAY = 86_400_000;
const STATUS_ORDER: Record<IncidentStatus, number> = { INVESTIGATING: 0, IDENTIFIED: 1, MONITORING: 2, RESOLVED: 3 };

export interface ServiceRow {
  name: string; status: ServiceStatus; responseTimeMs: number;
  /** The backend never computes it: always `null`. */
  errorRatePercent: number | null;
  checkedAt: string; stale: boolean;
  /** Share of healthy checks in the 24 hours before the reference; `null` when there is none (stale service). */
  uptimePercent: number | null;
  lastChangeAt: string | null; openIncidents: number;
}

export interface ServiceStats { healthy: number; degraded: number; down: number; stale: number }
export interface HistoryPoint { at: string; responseTimeMs: number; status: ServiceStatus }

/** Client-safe projection of an incident: no description. */
export interface IncidentRow {
  id: string; incidentCode: string; title: string; serviceName: string; severity: IncidentSeverity;
  status: IncidentStatus; impactScope: ImpactScope; companyName: string | null; detectedAt: string;
  resolvedAt: string | null; hasPostmortem: boolean;
}

export interface IncidentDetail {
  incident: SystemIncident;
  companyName: string | null;
  durationMinutes: number;
}

export interface ApiTotals {
  count: number; avgResponseMs: number; maxResponseMs: number; clientErrorPercent: number; serverErrorPercent: number;
}
export interface ApiDayRow { day: string; ok: number; clientErrors: number; serverErrors: number }
export interface ApiEndpointRow extends ApiTotals { method: ApiUsageRow["method"]; endpoint: string }
export interface ApiSummary { days: number; from: string; to: string; totals: ApiTotals; byDay: ApiDayRow[]; byEndpoint: ApiEndpointRow[] }

export interface UsageDayRow { day: string; booking: number; parcel: number; customer: number }
export interface UsageEventRow { eventName: string; eventCategory: "booking" | "parcel" | "customer"; count: number; activeDays: number; distinctUsers: number }
export interface UsageSummary {
  days: number; from: string; to: string; totals: { events: number; distinctUsers: number };
  byDay: UsageDayRow[]; byEvent: UsageEventRow[];
}

function companyName(companyId: string | null): string | null {
  return companyId ? getStore().companies.find((c) => c.id === companyId)?.name ?? "—" : null;
}

/** Why an incident cannot move to `target`, `null` when it can. Same order as the guards. */
export function incidentTransitionBlock(incident: Pick<SystemIncident, "status">, target: IncidentStatus): string | null {
  if (incident.status === "RESOLVED") return "Un incident résolu ne peut plus changer de statut";
  if (target === incident.status) return "L'incident est déjà dans cet état";
  if (STATUS_ORDER[target] < STATUS_ORDER[incident.status]) return "Un incident ne peut pas revenir en arrière";
  return null;
}

function checksOf(name: string) {
  return getStore().serviceChecks.filter((c) => c.serviceName === name).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt));
}

const rounded = (value: number) => Math.round(value * 10) / 10;
const dayOf = (at: Date) => at.toISOString().slice(0, 10);

function windowDays(days: number, now: Date): string[] {
  return Array.from({ length: days }, (_, i) => dayOf(new Date(now.getTime() - (days - 1 - i) * DAY)));
}

export const servicesRepo = {
  /** The most recent check of all services: the reference of the whole poll. */
  referenceTime(): string | null {
    return getStore().serviceChecks.reduce<string | null>((max, c) => (max === null || c.checkedAt > max ? c.checkedAt : max), null);
  },

  names(): string[] {
    return [...new Set(getStore().serviceChecks.map((c) => c.serviceName))].sort();
  },

  list(): ServiceRow[] {
    const s = getStore();
    const ref = this.referenceTime();
    const refMs = ref ? Date.parse(ref) : 0;
    return this.names().map((name): ServiceRow => {
      const checks = checksOf(name);
      const latest = checks.at(-1)!;
      const window = checks.filter((c) => refMs - Date.parse(c.checkedAt) <= 24 * HOUR);
      let lastChangeAt: string | null = null;
      for (let i = 1; i < checks.length; i++) if (checks[i]!.status !== checks[i - 1]!.status) lastChangeAt = checks[i]!.checkedAt;
      return {
        name, status: latest.status, responseTimeMs: latest.responseTimeMs, errorRatePercent: latest.errorRatePercent,
        checkedAt: latest.checkedAt, stale: refMs - Date.parse(latest.checkedAt) > STALE_AFTER_MS,
        uptimePercent: window.length === 0 ? null : rounded((window.filter((c) => c.status === "healthy").length / window.length) * 100),
        lastChangeAt,
        openIncidents: s.systemIncidents.filter((i) => i.serviceName === name && i.status !== "RESOLVED").length,
      };
    });
  },

  stats(): ServiceStats {
    const rows = this.list();
    const live = rows.filter((r) => !r.stale);
    return {
      healthy: live.filter((r) => r.status === "healthy").length,
      degraded: live.filter((r) => r.status === "degraded").length,
      down: live.filter((r) => r.status === "down").length,
      stale: rows.length - live.length,
    };
  },

  history(name: string): HistoryPoint[] {
    return checksOf(name).slice(-48).map((c) => ({ at: c.checkedAt, responseTimeMs: c.responseTimeMs, status: c.status }));
  },

  /** Dashboard projection: the latest check of every service that is still being polled. */
  latestLive(): ServiceHealth[] {
    return this.list().filter((r) => !r.stale).map((r) => ({ name: r.name, status: r.status, responseTimeMs: r.responseTimeMs }));
  },
};

function incidentRow(i: SystemIncident): IncidentRow {
  return {
    id: i.id, incidentCode: i.incidentCode, title: i.title, serviceName: i.serviceName, severity: i.severity,
    status: i.status, impactScope: i.impactScope, companyName: companyName(i.affectedCompanyId),
    detectedAt: i.detectedAt, resolvedAt: i.resolvedAt, hasPostmortem: i.postmortemUrl !== null,
  };
}

export const incidentsRepo = {
  listRows(filter: { status?: IncidentStatus; severity?: IncidentSeverity; serviceName?: string } = {}): IncidentRow[] {
    return getStore().systemIncidents
      .filter((i) =>
        (!filter.status || i.status === filter.status) &&
        (!filter.severity || i.severity === filter.severity) &&
        (!filter.serviceName || i.serviceName === filter.serviceName))
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt) || a.id.localeCompare(b.id))
      .map(incidentRow);
  },

  get(id: string): SystemIncident | undefined {
    return getStore().systemIncidents.find((i) => i.id === id);
  },

  detail(id: string, now: Date = new Date()): IncidentDetail | undefined {
    const incident = getStore().systemIncidents.find((i) => i.id === id);
    if (!incident) return undefined;
    const end = incident.resolvedAt ? Date.parse(incident.resolvedAt) : now.getTime();
    return {
      incident, companyName: companyName(incident.affectedCompanyId),
      durationMinutes: Math.max(0, Math.round((end - Date.parse(incident.detectedAt)) / 60_000)),
    };
  },
};

function totalsOf(rows: ApiUsageRow[]): ApiTotals {
  const count = rows.reduce((n, r) => n + r.count, 0);
  if (count === 0) return { count: 0, avgResponseMs: 0, maxResponseMs: 0, clientErrorPercent: 0, serverErrorPercent: 0 };
  const of = (cls: ApiUsageRow["statusClass"]) => rows.filter((r) => r.statusClass === cls).reduce((n, r) => n + r.count, 0);
  return {
    count,
    avgResponseMs: Math.round(rows.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / count),
    maxResponseMs: Math.max(...rows.map((r) => r.maxResponseMs)),
    clientErrorPercent: rounded((of("4xx") / count) * 100),
    serverErrorPercent: rounded((of("5xx") / count) * 100),
  };
}

export const apiRepo = {
  summary(filter: { days: number; companyId?: string }, now: Date = new Date()): ApiSummary {
    const days = windowDays(filter.days, now);
    const inWindow = new Set(days);
    const rows = getStore().apiUsage.filter((r) => inWindow.has(r.day) && (!filter.companyId || r.companyId === filter.companyId));
    const groups = new Map<string, ApiUsageRow[]>();
    for (const r of rows) groups.set(`${r.method} ${r.endpoint}`, [...(groups.get(`${r.method} ${r.endpoint}`) ?? []), r]);
    return {
      days: filter.days, from: days[0]!, to: days.at(-1)!, totals: totalsOf(rows),
      byDay: days.map((day): ApiDayRow => {
        const of = (cls: ApiUsageRow["statusClass"]) => rows.filter((r) => r.day === day && r.statusClass === cls).reduce((n, r) => n + r.count, 0);
        return { day, ok: of("2xx"), clientErrors: of("4xx"), serverErrors: of("5xx") };
      }),
      byEndpoint: [...groups.values()]
        .map((list): ApiEndpointRow => ({ method: list[0]!.method, endpoint: list[0]!.endpoint, ...totalsOf(list) }))
        .sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint)),
    };
  },
};

interface DerivedEvent {
  at: string; eventName: string; eventCategory: UsageEventRow["eventCategory"]; companyId: string; userId: string | null;
}

/** Product events the other screens already show, read as the backend's `AnalyticsEvent` would carry them. */
function derivedEvents(): DerivedEvent[] {
  const s = getStore();
  const out: DerivedEvent[] = [];
  const userOfBooking = (bookingId: string) => s.bookings.find((b) => b.id === bookingId)?.userId ?? null;
  for (const b of s.bookings) out.push({ at: b.createdAt, eventName: "booking_created", eventCategory: "booking", companyId: b.companyId, userId: b.userId });
  for (const t of s.transactions) {
    if (t.status === "COMPLETED" && t.completedAt) {
      out.push({ at: t.completedAt, eventName: "payment_completed", eventCategory: "booking", companyId: t.companyId, userId: userOfBooking(t.bookingId) });
    }
  }
  for (const t of s.tickets) out.push({ at: t.issuedAt, eventName: "ticket_issued", eventCategory: "booking", companyId: t.companyId, userId: userOfBooking(t.bookingId) });
  for (const h of s.parcelHistory) {
    const parcel = s.parcels.find((p) => p.id === h.parcelId);
    if (!parcel) continue;
    out.push({
      at: h.changedAt, eventName: h.previousStatus === null ? "parcel_created" : "parcel_status_changed",
      eventCategory: "parcel", companyId: parcel.companyId, userId: null,
    });
  }
  for (const f of s.feedbacks) {
    if (f.respondedAt) {
      out.push({
        at: f.respondedAt, eventName: "feedback_responded", eventCategory: "customer", companyId: f.companyId,
        userId: s.customers.find((c) => c.id === f.customerId)?.userId ?? null,
      });
    }
  }
  return out;
}

export const analyticsRepo = {
  summary(filter: { days: number; companyId?: string }, now: Date = new Date()): UsageSummary {
    const days = windowDays(filter.days, now);
    const inWindow = new Set(days);
    const events = derivedEvents().filter((e) => inWindow.has(e.at.slice(0, 10)) && (!filter.companyId || e.companyId === filter.companyId));
    const users = (list: DerivedEvent[]) => new Set(list.map((e) => e.userId).filter((u): u is string => u !== null));
    const names = [...new Set(events.map((e) => e.eventName))];
    return {
      days: filter.days, from: days[0]!, to: days.at(-1)!,
      totals: { events: events.length, distinctUsers: users(events).size },
      byDay: days.map((day): UsageDayRow => {
        const of = (cat: UsageEventRow["eventCategory"]) => events.filter((e) => e.at.slice(0, 10) === day && e.eventCategory === cat).length;
        return { day, booking: of("booking"), parcel: of("parcel"), customer: of("customer") };
      }),
      byEvent: names
        .map((eventName): UsageEventRow => {
          const list = events.filter((e) => e.eventName === eventName);
          return {
            eventName, eventCategory: list[0]!.eventCategory, count: list.length,
            activeDays: new Set(list.map((e) => e.at.slice(0, 10))).size, distinctUsers: users(list).size,
          };
        })
        .sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName)),
    };
  },
};
