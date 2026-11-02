import { addActivity } from "@/lib/repos/activity";
import { appendAudit } from "@/lib/repos/compliance";
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

export interface IncidentInput {
  title: string; serviceName: string; severity: IncidentSeverity; impactScope: ImpactScope;
  affectedCompanyId: string | null; description: string;
}

const STATUS_TEXT: Record<IncidentStatus, string> = {
  INVESTIGATING: "en investigation", IDENTIFIED: "identifié", MONITORING: "sous surveillance", RESOLVED: "résolu",
};
const SEVERITY_TEXT: Record<IncidentSeverity, string> = { LOW: "Faible", MEDIUM: "Moyenne", HIGH: "Haute", CRITICAL: "Critique" };

let incidentSeq = 1;

/** `SYS-` + 8 base-36 characters (Knuth's multiplicative hash), advanced until the code is unused. */
function nextIncidentCode(): string {
  const used = new Set(getStore().systemIncidents.map((i) => i.incidentCode));
  let n = getStore().systemIncidents.length + 1;
  for (;;) {
    const code = "SYS-" + ((n * 2_654_435_761) % 2 ** 32).toString(36).toUpperCase().padStart(8, "0");
    if (!used.has(code)) return code;
    n++;
  }
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

  /**
   * Declares an incident. Guards, in this order: title, service, severity, scope, company, description.
   * The incident starts as `INVESTIGATING`, detected now.
   */
  declare(input: IncidentInput, actor = "admin@sira.app", now: Date = new Date()): SystemIncident {
    const s = getStore();
    const title = input.title.trim();
    if (!title) throw new Error("Un titre est obligatoire");
    if (title.length > 200) throw new Error("Le titre est trop long (200 caractères maximum)");
    const serviceName = input.serviceName.trim();
    if (!serviceName) throw new Error("Le service est obligatoire");
    if (serviceName.length > 100) throw new Error("Le nom du service est trop long (100 caractères maximum)");
    if (!(INCIDENT_SEVERITIES as readonly string[]).includes(input.severity)) throw new Error("Gravité invalide");
    if (!(IMPACT_SCOPES as readonly string[]).includes(input.impactScope)) throw new Error("Portée invalide");
    if (input.impactScope === "SINGLE_COMPANY") {
      if (!input.affectedCompanyId) throw new Error("Une compagnie est obligatoire pour un incident limité à une compagnie");
      if (!s.companies.some((c) => c.id === input.affectedCompanyId)) throw new Error("Compagnie introuvable");
    } else if (input.affectedCompanyId) {
      throw new Error("Une compagnie ne peut être indiquée que pour un incident limité à une compagnie");
    }
    const description = input.description.trim();
    if (description.length > 10_000) throw new Error("La description est trop longue (10000 caractères maximum)");

    const incident: SystemIncident = {
      id: `incident-${now.getTime()}-${incidentSeq++}`, incidentCode: nextIncidentCode(), serviceName,
      severity: input.severity, status: "INVESTIGATING", title, description: description || null,
      impactScope: input.impactScope, affectedCompanyId: input.impactScope === "SINGLE_COMPANY" ? input.affectedCompanyId : null,
      detectedAt: now.toISOString(), resolvedAt: null, reportedBy: actor, postmortemUrl: null,
      createdAt: now.toISOString(), updatedAt: null,
    };
    s.systemIncidents.push(incident);
    appendAudit({
      companyId: incident.affectedCompanyId, action: "CREATE", entityType: "SystemIncident", entityId: incident.id,
      beforeState: null, afterState: { status: incident.status, severity: incident.severity, impactScope: incident.impactScope },
      sourceService: "monitoring-service",
    }, actor, now);
    addActivity(incident.affectedCompanyId, actor, `Incident ${incident.incidentCode} déclaré (${SEVERITY_TEXT[incident.severity]}) sur ${serviceName}`, now);
    return incident;
  },

  /** Moves an incident forward. Guards, in this order: incident exists, valid status, not resolved, different, not backwards. */
  advance(incidentId: string, target: IncidentStatus, actor = "admin@sira.app", now: Date = new Date()): SystemIncident {
    const incident = getStore().systemIncidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error("Incident introuvable");
    if (!(INCIDENT_STATUSES as readonly string[]).includes(target)) throw new Error("Statut invalide");
    const blocked = incidentTransitionBlock(incident, target);
    if (blocked) throw new Error(blocked);
    const previous = incident.status;
    incident.status = target;
    incident.updatedAt = now.toISOString();
    if (target === "RESOLVED") incident.resolvedAt = now.toISOString();
    appendAudit({
      companyId: incident.affectedCompanyId, action: "UPDATE", entityType: "SystemIncident", entityId: incident.id,
      beforeState: { status: previous }, afterState: { status: target }, sourceService: "monitoring-service",
    }, actor, now);
    addActivity(incident.affectedCompanyId, actor, `Incident ${incident.incidentCode} : ${STATUS_TEXT[previous]} → ${STATUS_TEXT[target]}`, now);
    return incident;
  },

  /**
   * Records the postmortem address, at any status. Guards, in this order: incident exists, address present,
   * at most 2048 characters, an http(s) link without space. The audit line is written on the first address only.
   */
  setPostmortem(incidentId: string, url: string, actor = "admin@sira.app", now: Date = new Date()): SystemIncident {
    const incident = getStore().systemIncidents.find((i) => i.id === incidentId);
    if (!incident) throw new Error("Incident introuvable");
    const address = url.trim();
    if (!address) throw new Error("L'adresse du postmortem est obligatoire");
    if (address.length > 2048) throw new Error("L'adresse du postmortem est trop longue (2048 caractères maximum)");
    if (!/^https?:\/\/\S+$/i.test(address)) throw new Error("L'adresse du postmortem doit commencer par http:// ou https://");
    const first = incident.postmortemUrl === null;
    incident.postmortemUrl = address;
    incident.updatedAt = now.toISOString();
    if (first) {
      appendAudit({
        companyId: incident.affectedCompanyId, action: "UPDATE", entityType: "SystemIncident", entityId: incident.id,
        beforeState: { postmortem: "false" }, afterState: { postmortem: "true" }, sourceService: "monitoring-service",
      }, actor, now);
    }
    addActivity(incident.affectedCompanyId, actor, `Postmortem de l'incident ${incident.incidentCode} ${first ? "ajouté" : "mis à jour"}`, now);
    return incident;
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
