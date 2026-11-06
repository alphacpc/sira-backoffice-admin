import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { arr, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import type { IncidentRow, ServiceStats, UsageDayRow, UsageEventRow, UsageSummary } from "@/lib/repos/monitoring";
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, IMPACT_SCOPES } from "@/lib/repos/monitoring";
import {
  SERVICE_SLO, apiDash, fold, incidentDash, monOverview, usageDash,
  type ApiDash, type Consumer, type FleetPoint, type IncidentDash, type MonOverview, type MonTab, type ServiceMetric, type UsageDash,
} from "@/lib/repos/monitoring-hub";
import type { ApiUsageRow, ServiceStatus } from "@/lib/types";

const DAY = 86_400_000;
const STATUSES = ["healthy", "degraded", "down"] as const;
const METHODS = ["GET", "POST", "PATCH"] as const;
const CLASSES = ["2xx", "4xx", "5xx"] as const;
const dayOf = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Window of `days` whole UTC days ending today, and the same length just before it. */
export function windows(days: number, now: Date) {
  const startOfToday = Date.parse(dayOf(now.getTime()));
  const from = startOfToday - (days - 1) * DAY;
  return { from, prevFrom: from - days * DAY, to: now.getTime() + 1_000 };
}
const iso = (ms: number) => new Date(ms).toISOString();

// --- services ---------------------------------------------------------------------------------------------

interface History { at: string; status: ServiceStatus; ms: number }

export function toMetric(raw: unknown, summary: Record<string, unknown> | undefined, history: History[], openIncidents: number): ServiceMetric {
  const r = obj(raw);
  const s = summary ?? {};
  const stale = r.stale === true;
  const checks = num(s.checks);
  const uptime = stale || checks === 0 ? null : Math.round(num(s.uptimePercent) * 10) / 10;
  return {
    name: str(r.serviceName), status: pick<ServiceStatus>(r.status, STATUSES, false, "down"), responseTimeMs: num(r.responseTimeMs),
    errorRatePercent: numOrNull(r.errorRatePercent), checkedAt: str(r.checkedAt), stale, uptimePercent: uptime,
    lastChangeAt: strOrNull(s.lastChangeAt), openIncidents,
    p50: num(s.p50), p95: num(s.p95), max: num(s.max), avg: Math.round(num(s.avg)), downChecks: num(s.downChecks), degradedChecks: num(s.degradedChecks),
    sloOk: (uptime ?? 0) >= SERVICE_SLO, states: history,
  };
}

export function toHistory(raw: unknown): History[] {
  return arr(raw).map((p) => ({ at: str(p.at), status: pick<ServiceStatus>(p.status, STATUSES, false, "down"), ms: num(p.responseTimeMs) }))
    .sort((a, b) => a.at.localeCompare(b.at));
}

/** One point per minute: the last check of each live service in that minute, so the fleet chart is not a series of singletons. */
export function fleetFrom(metrics: ServiceMetric[]): FleetPoint[] {
  const byMinute = new Map<string, Map<string, { ms: number; status: ServiceStatus }>>();
  for (const m of metrics.filter((x) => !x.stale)) {
    for (const c of m.states) {
      const key = c.at.slice(0, 16);
      const bucket = byMinute.get(key) ?? new Map();
      bucket.set(m.name, { ms: c.ms, status: c.status });
      byMinute.set(key, bucket);
    }
  }
  return [...byMinute].sort(([a], [b]) => a.localeCompare(b)).slice(-48).map(([at, services]) => {
    const list = [...services.values()];
    const healthy = list.filter((x) => x.status === "healthy").length;
    return {
      at, avg: Math.round(list.reduce((n, x) => n + x.ms, 0) / list.length), max: Math.max(...list.map((x) => x.ms)),
      healthy, degraded: list.filter((x) => x.status === "degraded").length, down: list.filter((x) => x.status === "down").length,
      availability: Math.round((healthy / list.length) * 1000) / 10,
    };
  });
}

export function seriesFrom(metrics: ServiceMetric[], names: string[]): Record<string, number | string>[] {
  const pickMetrics = metrics.filter((m) => names.includes(m.name));
  const ats = [...new Set(pickMetrics.flatMap((m) => m.states.map((c) => c.at.slice(0, 16))))].sort().slice(-48);
  return ats.map((at) => {
    const row: Record<string, number | string> = { t: at.slice(11, 16) };
    for (const m of pickMetrics) {
      const c = [...m.states].reverse().find((x) => x.at.slice(0, 16) === at);
      if (c) row[m.name] = Math.min(c.ms, 2000);
    }
    return row;
  });
}

export const statsOf = (metrics: ServiceMetric[]): ServiceStats => {
  const up = metrics.filter((m) => !m.stale);
  return {
    healthy: up.filter((m) => m.status === "healthy").length, degraded: up.filter((m) => m.status === "degraded").length,
    down: up.filter((m) => m.status === "down").length, stale: metrics.length - up.length,
  };
};

export async function liveServiceMetrics(incidents: IncidentRow[]): Promise<ServiceMetric[]> {
  const [list, summary] = await Promise.all([
    soft<unknown>("/health/services"), soft<unknown>("/admin/health/services/summary?windowHours=24"),
  ]);
  const rows = Array.isArray(list) ? list.map(obj) : [];
  const sums = new Map(arr(summary).map((s) => [str(s.name), s] as const));
  const histories = await Promise.all(rows.map((r) => soft<unknown>(`/admin/health/services/${encodeURIComponent(str(r.serviceName))}/history?limit=48&windowHours=24`)));
  return rows.map((r, i) => toMetric(r, sums.get(str(r.serviceName)), toHistory(histories[i]),
    incidents.filter((x) => x.serviceName === str(r.serviceName) && x.status !== "RESOLVED").length))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// --- incidents ---------------------------------------------------------------------------------------------

export function toIncidentRow(raw: unknown, names: Map<string, string>): IncidentRow {
  const i = obj(raw);
  const company = strOrNull(i.affectedCompanyId);
  return {
    id: str(i.id), incidentCode: str(i.incidentCode, "—"), title: str(i.title, "—"), serviceName: str(i.serviceName, "—"),
    severity: pick(i.severity, INCIDENT_SEVERITIES, true, "LOW"), status: pick(i.status, INCIDENT_STATUSES, true, "INVESTIGATING"),
    impactScope: pick(i.impactScope, IMPACT_SCOPES, true, "PLATFORM_WIDE"), companyName: company ? (names.get(company) ?? "—") : null,
    detectedAt: str(i.detectedAt), resolvedAt: strOrNull(i.resolvedAt), hasPostmortem: typeof i.postmortemUrl === "string" && i.postmortemUrl !== "",
  };
}

export async function liveIncidentRows(): Promise<IncidentRow[]> {
  const [rows, n] = await Promise.all([loadAll("/incidents", new URLSearchParams()), companyNames()]);
  return rows.map((r) => toIncidentRow(r, n));
}

// --- API traffic -------------------------------------------------------------------------------------------

export function toApiRows(raw: unknown): ApiUsageRow[] {
  return arr(raw).map((l) => ({
    day: str(l.day), companyId: null, endpoint: str(l.endpoint, "—"), method: pick<ApiUsageRow["method"]>(l.method, METHODS, true, "GET"),
    statusClass: pick<ApiUsageRow["statusClass"]>(l.statusClass, CLASSES, false, "2xx"), count: num(l.count),
    avgResponseMs: num(l.avgResponseMs), maxResponseMs: num(l.maxResponseMs),
  }));
}

export function toConsumers(raw: unknown, names: Map<string, string>): Consumer[] {
  const rows = arr(raw);
  const total = rows.reduce((n, c) => n + num(c.count), 0);
  return rows.map((c): Consumer => {
    const id = strOrNull(c.companyId);
    const count = num(c.count);
    return {
      companyId: id, name: id ? (names.get(id) ?? "—") : "Anonyme (public)", count,
      err5: count ? Math.round((num(c.count5xx) / count) * 1000) / 10 : 0, avgMs: Math.round(num(c.avgResponseMs)), share: total ? (count / total) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);
}

async function apiSource(days: number, companyId: string | undefined, now: Date) {
  const w = windows(days, now);
  const [rows, consumers, n] = await Promise.all([
    soft<unknown>(`/usage/api?${withFilters({ from: iso(w.prevFrom), to: iso(w.to), companyId })}`),
    soft<unknown>(`/admin/usage/api/consumers?${withFilters({ from: iso(w.from), to: iso(w.to), companyId })}`),
    companyNames(),
  ]);
  return { rows: toApiRows(rows), consumers: toConsumers(consumers, n) };
}

export async function liveApiDash(f: { days: number; companyId?: string; q?: string }, now: Date): Promise<ApiDash> {
  return apiDash(f, now, await apiSource(f.days, f.companyId, now));
}

// --- product usage -----------------------------------------------------------------------------------------

type UsageCategory = UsageEventRow["eventCategory"];
const USAGE_CATEGORIES: readonly UsageCategory[] = ["booking", "parcel", "customer"];

/** Only booking, parcel and customer events are shown; HR and marketing events are left out. */
export function toUsageSummary(counts: unknown, summary: unknown, days: number, from: number): UsageSummary {
  const rows = arr(counts).filter((c) => (USAGE_CATEGORIES as readonly string[]).includes(str(c.eventCategory)));
  const sum = obj(summary);
  const perEvent = new Map(arr(sum.byEvent).map((e) => [str(e.eventName), e] as const));
  const dayList = Array.from({ length: days }, (_, i) => dayOf(from + i * DAY));
  const byEvent = [...new Set(rows.map((r) => str(r.eventName)))].map((eventName): UsageEventRow => {
    const list = rows.filter((r) => str(r.eventName) === eventName);
    const e = perEvent.get(eventName);
    return {
      eventName, eventCategory: str(list[0]!.eventCategory) as UsageCategory, count: list.reduce((n, r) => n + num(r.count), 0),
      activeDays: e ? num(e.activeDays) : new Set(list.map((r) => str(r.day))).size, distinctUsers: e ? num(e.distinctUsers) : 0,
    };
  }).sort((a, b) => b.count - a.count || a.eventName.localeCompare(b.eventName));
  return {
    days, from: dayList[0]!, to: dayList.at(-1)!,
    totals: { events: rows.reduce((n, r) => n + num(r.count), 0), distinctUsers: num(sum.distinctUsers) },
    byDay: dayList.map((day): UsageDayRow => {
      const of = (cat: UsageCategory) => rows.filter((r) => str(r.day) === day && str(r.eventCategory) === cat).reduce((n, r) => n + num(r.count), 0);
      return { day, booking: of("booking"), parcel: of("parcel"), customer: of("customer") };
    }),
    byEvent,
  };
}

async function usageSummary(days: number, from: number, to: number, companyId?: string) {
  const [counts, summary] = await Promise.all([
    soft<unknown>(`/analytics/events/counts?${withFilters({ from: iso(from), to: iso(to), companyId })}`),
    soft<unknown>(`/admin/analytics/events/summary?${withFilters({ from: iso(from), to: iso(to), companyId })}`),
  ]);
  return toUsageSummary(counts, summary, days, from);
}

export async function liveUsageDash(f: { days: number; companyId?: string; q?: string }, now: Date): Promise<UsageDash> {
  const w = windows(f.days, now);
  const [cur, prev] = await Promise.all([usageSummary(f.days, w.from, w.to, f.companyId), usageSummary(f.days, w.prevFrom, w.from, f.companyId)]);
  return usageDash(f, now, { cur, prev });
}

// --- dashboards --------------------------------------------------------------------------------------------

export async function liveIncidentDash(f: { q?: string; status?: IncidentRow["status"]; severity?: IncidentRow["severity"]; serviceName?: string }, now: Date, rows?: IncidentRow[]): Promise<IncidentDash> {
  return incidentDash(f, now, rows ?? (await liveIncidentRows()));
}

export async function liveMonOverview(f: { days: number; companyId?: string }, now: Date): Promise<MonOverview> {
  const incidentRows = await liveIncidentRows();
  const [metrics, api] = await Promise.all([liveServiceMetrics(incidentRows), liveApiDash(f, now)]);
  return monOverview(f, now, { metrics, stats: statsOf(metrics), api, incidents: incidentDash({}, now, incidentRows), fleet: fleetFrom(metrics) });
}

/** Null counter = its source failed, so the tab shows no badge. */
export async function liveMonCounts(q: string, f: { days: number; companyId?: string }, now: Date): Promise<Record<MonTab, number | null>> {
  const w = windows(f.days, now);
  const [services, incidents, api, usage] = await Promise.all([
    soft<unknown>("/health/services"),
    soft<unknown>(`/incidents?${withFilters({ q: q || undefined, size: "1" })}`),
    soft<unknown>(`/usage/api?${withFilters({ from: iso(w.from), to: iso(w.to), companyId: f.companyId })}`),
    soft<unknown>(`/analytics/events/counts?${withFilters({ from: iso(w.from), to: iso(w.to), companyId: f.companyId })}`),
  ]);
  const hit = (...v: string[]) => !q || v.some((x) => fold(x).includes(fold(q)));
  return {
    apercu: 0,
    services: Array.isArray(services) ? arr(services).filter((s) => hit(str(s.serviceName))).length : null,
    incidents: incidents && typeof incidents === "object" ? numOrNull(obj(incidents).totalElements) : null,
    api: Array.isArray(api) ? new Set(arr(api).filter((l) => hit(str(l.endpoint), str(l.method))).map((l) => `${str(l.method)} ${str(l.endpoint)}`)).size : null,
    usage: Array.isArray(usage) ? new Set(arr(usage).filter((c) => USAGE_CATEGORIES.includes(str(c.eventCategory) as UsageCategory) && hit(str(c.eventName))).map((c) => str(c.eventName))).size : null,
  };
}

export async function liveServiceNames(): Promise<string[]> {
  const list = await soft<unknown>("/health/services");
  return Array.isArray(list) ? arr(list).map((s) => str(s.serviceName)).filter(Boolean).sort() : [];
}
