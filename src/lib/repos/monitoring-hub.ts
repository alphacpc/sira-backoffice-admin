import {
  analyticsRepo, incidentsRepo, servicesRepo, STALE_AFTER_MS,
  type ApiTotals, type IncidentRow, type ServiceRow, type UsageSummary,
} from "@/lib/repos/monitoring";
import { getStore } from "@/lib/repos/store";
import type { ApiUsageRow, IncidentSeverity, IncidentStatus, ServiceStatus } from "@/lib/types";

export const MON_TABS = ["apercu", "services", "api", "incidents", "usage"] as const;
export type MonTab = (typeof MON_TABS)[number];
export const WINDOWS = [7, 14, 30] as const;
/** Availability objective of the API (share of calls that do not end in a 5xx). */
export const API_SLO = 99.5;
/** Availability objective of a service over 24 hours. */
export const SERVICE_SLO = 99.5;
export const LATENCY_BUDGET_MS = 500;

const DAY = 86_400_000;
const r1 = (n: number) => Math.round(n * 10) / 10;

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}
const dayOf = (d: Date) => d.toISOString().slice(0, 10);
const daysBack = (n: number, now: Date, shift = 0) =>
  Array.from({ length: n }, (_, i) => dayOf(new Date(now.getTime() - (shift + n - 1 - i) * DAY)));
const percentile = (sorted: number[], p: number) => sorted.length ? sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)]! : 0;

/* ───────────── Services ───────────── */
export interface ServiceMetric extends ServiceRow {
  p50: number; p95: number; max: number; avg: number; downChecks: number; degradedChecks: number; sloOk: boolean;
  states: { at: string; status: ServiceStatus; ms: number }[];
}
export interface FleetPoint { at: string; avg: number; max: number; healthy: number; degraded: number; down: number; availability: number }

export function serviceMetrics(q?: string, status?: ServiceStatus | "stale"): ServiceMetric[] {
  const hit = matcher(q);
  const checks = getStore().serviceChecks;
  return servicesRepo.list()
    .map((row): ServiceMetric => {
      const mine = checks.filter((c) => c.serviceName === row.name).sort((a, b) => a.checkedAt.localeCompare(b.checkedAt)).slice(-48);
      const ms = mine.map((c) => c.responseTimeMs).sort((a, b) => a - b);
      return {
        ...row, p50: percentile(ms, 50), p95: percentile(ms, 95), max: ms.at(-1) ?? 0,
        avg: ms.length ? Math.round(ms.reduce((n, x) => n + x, 0) / ms.length) : 0,
        downChecks: mine.filter((c) => c.status === "down").length, degradedChecks: mine.filter((c) => c.status === "degraded").length,
        sloOk: (row.uptimePercent ?? 0) >= SERVICE_SLO,
        states: mine.map((c) => ({ at: c.checkedAt, status: c.status, ms: c.responseTimeMs })),
      };
    })
    .filter((s) => (!status || (status === "stale" ? s.stale : !s.stale && s.status === status)) && hit(s.name));
}

export function fleetTimeline(): FleetPoint[] {
  const live = new Set(servicesRepo.list().filter((s) => !s.stale).map((s) => s.name));
  const byAt = new Map<string, { ms: number; status: ServiceStatus }[]>();
  for (const c of getStore().serviceChecks) {
    if (!live.has(c.serviceName)) continue;
    byAt.set(c.checkedAt, [...(byAt.get(c.checkedAt) ?? []), { ms: c.responseTimeMs, status: c.status }]);
  }
  return [...byAt].sort(([a], [b]) => a.localeCompare(b)).slice(-48).map(([at, list]) => {
    const healthy = list.filter((x) => x.status === "healthy").length;
    return {
      at, avg: Math.round(list.reduce((n, x) => n + x.ms, 0) / list.length), max: Math.max(...list.map((x) => x.ms)),
      healthy, degraded: list.filter((x) => x.status === "degraded").length, down: list.filter((x) => x.status === "down").length,
      availability: r1((healthy / list.length) * 100),
    };
  });
}

/** One row per time step, one column per service: the multi-series latency chart. */
export function serviceLatencySeries(names: string[]): Record<string, number | string>[] {
  const checks = getStore().serviceChecks.filter((c) => names.includes(c.serviceName));
  const ats = [...new Set(checks.map((c) => c.checkedAt))].sort().slice(-48);
  return ats.map((at) => {
    const row: Record<string, number | string> = { t: at.slice(11, 16) };
    for (const c of checks) if (c.checkedAt === at) row[c.serviceName] = Math.min(c.responseTimeMs, 2000);
    return row;
  });
}

/* ───────────── API ───────────── */
export interface ApiDayPoint {
  day: string; total: number; ok: number; c4: number; c5: number; err4: number; err5: number; avgMs: number; maxMs: number;
}
export interface EndpointMetric {
  method: ApiUsageRow["method"]; endpoint: string; count: number; share: number; avgMs: number; maxMs: number;
  err4: number; err5: number; spark: number[]; deltaPct: number | null; slow: boolean;
}
export interface Consumer { companyId: string | null; name: string; count: number; err5: number; avgMs: number; share: number }
export interface ApiDash {
  days: number; from: string; to: string;
  totals: ApiTotals & { rps: number; availability: number; budgetUsedPct: number; slowShare: number };
  prev: { count: number; avgMs: number; err5: number; availability: number } | null;
  byDay: ApiDayPoint[]; endpoints: EndpointMetric[];
  heat: { method: string; endpoint: string; cells: { day: string; count: number; err5: number }[] }[];
  consumers: Consumer[]; methods: { method: string; count: number }[]; peak: ApiDayPoint | null;
}

function weighted(rows: ApiUsageRow[]) {
  const count = rows.reduce((n, r) => n + r.count, 0);
  const of = (cls: ApiUsageRow["statusClass"]) => rows.filter((r) => r.statusClass === cls).reduce((n, r) => n + r.count, 0);
  return {
    count, c4: of("4xx"), c5: of("5xx"),
    avgMs: count ? Math.round(rows.reduce((n, r) => n + r.avgResponseMs * r.count, 0) / count) : 0,
    maxMs: rows.reduce((m, r) => Math.max(m, r.maxResponseMs), 0),
  };
}

export function apiDash(f: { days: number; companyId?: string; q?: string }, now: Date = new Date()): ApiDash {
  const hit = matcher(f.q);
  const all = getStore().apiUsage.filter((r) => (!f.companyId || r.companyId === f.companyId) && hit(r.endpoint, r.method));
  const days = daysBack(f.days, now);
  const prevDays = new Set(daysBack(f.days, now, f.days));
  const inWin = new Set(days);
  const rows = all.filter((r) => inWin.has(r.day));
  const prevRows = all.filter((r) => prevDays.has(r.day));
  const t = weighted(rows);
  const pt = weighted(prevRows);
  const avail = (c5: number, count: number) => (count ? r1((1 - c5 / count) * 100) : 100);
  const byDay = days.map((day): ApiDayPoint => {
    const w = weighted(rows.filter((r) => r.day === day));
    return {
      day, total: w.count, ok: w.count - w.c4 - w.c5, c4: w.c4, c5: w.c5, err4: w.count ? r1((w.c4 / w.count) * 100) : 0,
      err5: w.count ? Math.round((w.c5 / w.count) * 1000) / 10 : 0, avgMs: w.avgMs, maxMs: w.maxMs,
    };
  });
  const keys = [...new Set(rows.map((r) => `${r.method} ${r.endpoint}`))];
  const endpoints = keys.map((key): EndpointMetric => {
    const list = rows.filter((r) => `${r.method} ${r.endpoint}` === key);
    const prev = weighted(prevRows.filter((r) => `${r.method} ${r.endpoint}` === key));
    const w = weighted(list);
    return {
      method: list[0]!.method, endpoint: list[0]!.endpoint, count: w.count, share: t.count ? (w.count / t.count) * 100 : 0,
      avgMs: w.avgMs, maxMs: w.maxMs, err4: w.count ? r1((w.c4 / w.count) * 100) : 0, err5: w.count ? Math.round((w.c5 / w.count) * 1000) / 10 : 0,
      spark: days.map((d) => list.filter((r) => r.day === d).reduce((n, r) => n + r.count, 0)),
      deltaPct: prev.count ? Math.round(((w.count - prev.count) / prev.count) * 100) : null, slow: w.avgMs > LATENCY_BUDGET_MS,
    };
  }).sort((a, b) => b.count - a.count || a.endpoint.localeCompare(b.endpoint));
  const companies = getStore().companies;
  const ids = [...new Set(rows.map((r) => r.companyId))];
  const consumers = ids.map((id): Consumer => {
    const w = weighted(rows.filter((r) => r.companyId === id));
    return {
      companyId: id, name: id ? companies.find((c) => c.id === id)?.name ?? "—" : "Anonyme (public)", count: w.count,
      err5: w.count ? Math.round((w.c5 / w.count) * 1000) / 10 : 0, avgMs: w.avgMs, share: t.count ? (w.count / t.count) * 100 : 0,
    };
  }).sort((a, b) => b.count - a.count);
  const slowCalls = rows.filter((r) => r.avgResponseMs > LATENCY_BUDGET_MS).reduce((n, r) => n + r.count, 0);
  return {
    days: f.days, from: days[0]!, to: days.at(-1)!,
    totals: {
      count: t.count, avgResponseMs: t.avgMs, maxResponseMs: t.maxMs,
      clientErrorPercent: t.count ? r1((t.c4 / t.count) * 100) : 0, serverErrorPercent: t.count ? Math.round((t.c5 / t.count) * 1000) / 10 : 0,
      rps: Math.round((t.count / (f.days * 86_400)) * 100) / 100, availability: avail(t.c5, t.count),
      budgetUsedPct: t.count ? Math.round((t.c5 / (t.count * (1 - API_SLO / 100))) * 100) : 0,
      slowShare: t.count ? r1((slowCalls / t.count) * 100) : 0,
    },
    prev: pt.count ? { count: pt.count, avgMs: pt.avgMs, err5: Math.round((pt.c5 / pt.count) * 1000) / 10, availability: avail(pt.c5, pt.count) } : null,
    byDay, endpoints,
    heat: endpoints.slice(0, 10).map((e) => ({
      method: e.method, endpoint: e.endpoint,
      cells: days.map((day) => {
        const w = weighted(rows.filter((r) => r.day === day && r.method === e.method && r.endpoint === e.endpoint));
        return { day, count: w.count, err5: w.count ? Math.round((w.c5 / w.count) * 1000) / 10 : 0 };
      }),
    })),
    consumers, methods: (["GET", "POST", "PATCH"] as const).map((m) => ({ method: m, count: rows.filter((r) => r.method === m).reduce((n, r) => n + r.count, 0) })).filter((m) => m.count > 0),
    peak: byDay.reduce<ApiDayPoint | null>((m, d) => (m === null || d.total > m.total ? d : m), null),
  };
}

/* ───────────── Incidents ───────────── */
export interface IncidentDash {
  rows: IncidentRow[]; open: number; resolved: number; mttrMinutes: number | null; last30: number;
  bySeverity: { severity: IncidentSeverity; value: number }[];
  byService: { name: string; count: number; open: number }[];
  timeline: { row: IncidentRow; startPct: number; endPct: number }[];
  spanDays: number;
}
export const TIMELINE_DAYS = 90;

export function incidentDash(f: { q?: string; status?: IncidentStatus; severity?: IncidentSeverity; serviceName?: string }, now: Date = new Date()): IncidentDash {
  const hit = matcher(f.q);
  const everything = incidentsRepo.listRows();
  const rows = incidentsRepo.listRows({ status: f.status, severity: f.severity, serviceName: f.serviceName })
    .filter((i) => hit(i.incidentCode, i.title, i.serviceName, i.companyName));
  const durations = everything.filter((i) => i.resolvedAt).map((i) => (Date.parse(i.resolvedAt!) - Date.parse(i.detectedAt)) / 60_000);
  const span = TIMELINE_DAYS * DAY;
  const start = now.getTime() - span;
  const pct = (ms: number) => Math.min(100, Math.max(0, ((ms - start) / span) * 100));
  const services = [...new Set(everything.map((i) => i.serviceName))];
  return {
    rows, open: everything.filter((i) => i.status !== "RESOLVED").length, resolved: everything.filter((i) => i.status === "RESOLVED").length,
    mttrMinutes: durations.length ? Math.round(durations.reduce((n, x) => n + x, 0) / durations.length) : null,
    last30: everything.filter((i) => now.getTime() - Date.parse(i.detectedAt) <= 30 * DAY).length,
    bySeverity: (["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((severity) => ({ severity, value: everything.filter((i) => i.severity === severity).length })),
    byService: services.map((name) => ({ name, count: everything.filter((i) => i.serviceName === name).length, open: everything.filter((i) => i.serviceName === name && i.status !== "RESOLVED").length })).sort((a, b) => b.count - a.count),
    timeline: rows.filter((i) => now.getTime() - Date.parse(i.detectedAt) <= span).map((row) => ({
      row, startPct: pct(Date.parse(row.detectedAt)), endPct: pct(row.resolvedAt ? Date.parse(row.resolvedAt) : now.getTime()),
    })),
    spanDays: TIMELINE_DAYS,
  };
}

/* ───────────── Usage ───────────── */
export interface UsageDash { cur: UsageSummary; prev: UsageSummary; deltaEvents: number | null; deltaUsers: number | null }
export function usageDash(f: { days: number; companyId?: string; q?: string }, now: Date = new Date()): UsageDash {
  const hit = matcher(f.q);
  const cur = analyticsRepo.summary({ days: f.days, companyId: f.companyId }, now);
  const prev = analyticsRepo.summary({ days: f.days, companyId: f.companyId }, new Date(now.getTime() - f.days * DAY));
  const delta = (a: number, b: number) => (b ? Math.round(((a - b) / b) * 100) : null);
  return {
    cur: { ...cur, byEvent: cur.byEvent.filter((e) => hit(e.eventName)) }, prev,
    deltaEvents: delta(cur.totals.events, prev.totals.events), deltaUsers: delta(cur.totals.distinctUsers, prev.totals.distinctUsers),
  };
}

/* ───────────── Counts and overview ───────────── */
export function monCounts(q?: string, f: { days: number; companyId?: string } = { days: 7 }): Record<MonTab, number> {
  return {
    apercu: 0, services: serviceMetrics(q).length, api: apiDash({ ...f, q }).endpoints.length,
    incidents: incidentDash({ q }).rows.length, usage: usageDash({ ...f, q }).cur.byEvent.length,
  };
}

export interface MonOverview {
  services: { total: number; healthy: number; degraded: number; down: number; stale: number; availability24h: number | null; slowest: ServiceMetric | null };
  api: ApiDash; incidents: IncidentDash; fleet: FleetPoint[]; metrics: ServiceMetric[];
}
export function monOverview(f: { days: number; companyId?: string }, now: Date = new Date()): MonOverview {
  const metrics = serviceMetrics();
  const stats = servicesRepo.stats();
  const live = metrics.filter((m) => !m.stale);
  const checks = live.reduce((n, m) => n + m.states.length, 0);
  const healthy = live.reduce((n, m) => n + m.states.filter((s) => s.status === "healthy").length, 0);
  return {
    services: {
      total: metrics.length, ...stats, availability24h: checks ? r1((healthy / checks) * 100) : null,
      slowest: [...live].sort((a, b) => b.responseTimeMs - a.responseTimeMs)[0] ?? null,
    },
    api: apiDash(f, now), incidents: incidentDash({}, now), fleet: fleetTimeline(), metrics,
  };
}
export { STALE_AFTER_MS };
