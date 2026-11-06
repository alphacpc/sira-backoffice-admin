import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { arr, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import { truncateIp } from "@/lib/mask";
import {
  ACCESS_REASONS, ACCESS_TYPES, AUDIT_ACTIONS, DATA_CATEGORIES, DEFAULT_RETENTION_DAYS, DSR_STATUSES, DSR_TYPES,
  type AccessRow, type AuditRow, type ConsentUserOption, type DsrRow, type RetentionRow,
} from "@/lib/repos/compliance";
import { fold, type ComplianceOverview, type ComplianceTab, type ConsentCardData } from "@/lib/repos/compliance-hub";
import type { AuditActorType, ConsentType, DataSubjectType } from "@/lib/types";

type Names = Map<string, string>;
const DAY = 86_400_000;
const ACTOR_TYPES = ["USER", "EMPLOYEE", "SYSTEM", "API_KEY"] as const;
const SUBJECT_TYPES = ["CUSTOMER", "EMPLOYEE", "USER"] as const;
const CONSENT_TYPES = ["MARKETING_EMAIL", "MARKETING_SMS", "DATA_SHARING_PARTNERS", "COOKIES_ANALYTICS", "GEOLOCATION"] as const;

/** Display names of accounts, by id: the compliance service only holds identifiers. */
export async function userNames(ids: string[]): Promise<Names> {
  const unique = [...new Set(ids.filter(Boolean))];
  const out: Names = new Map();
  for (let i = 0; i < unique.length; i += 100) {
    const qs = new URLSearchParams();
    for (const id of unique.slice(i, i + 100)) qs.append("ids", id);
    const raw = await soft<unknown>(`/admin/users/lookup?${qs}`);
    for (const u of Array.isArray(raw) ? raw.map(obj) : []) out.set(str(u.id), str(u.displayName) || str(u.username, "—"));
  }
  return out;
}

export function toAuditRow(raw: unknown, companies: Names, users: Names): AuditRow {
  const a = obj(raw);
  const actorType = pick<AuditActorType>(a.actorType, ACTOR_TYPES, true, "SYSTEM");
  const actor = strOrNull(a.actorUserId);
  const company = strOrNull(a.companyId);
  return {
    id: str(a.id), createdAt: str(a.createdAt), companyId: company, companyName: company ? (companies.get(company) ?? "—") : "Plateforme",
    actorLabel: actor ? (users.get(actor) ?? "—") : actorType === "SYSTEM" ? "Système" : "—", actorType,
    action: pick(a.action, AUDIT_ACTIONS, true, "UPDATE"), entityType: str(a.entityType, "—"), entityRef: str(a.entityId, "—"),
    sourceService: strOrNull(a.sourceService), ipTruncated: a.ipAddress ? truncateIp(str(a.ipAddress)) : "—",
  };
}

export function toAccessRow(raw: unknown, users: Names): AccessRow {
  const a = obj(raw);
  const by = strOrNull(a.accessedByUserId), subject = strOrNull(a.dataSubjectId);
  return {
    id: str(a.id), createdAt: str(a.createdAt), accessedByLabel: by ? (users.get(by) ?? "—") : "Système",
    subjectType: pick<DataSubjectType>(a.dataSubjectType, SUBJECT_TYPES, true, "USER"), subjectName: subject ? (users.get(subject) ?? "—") : "—",
    dataCategory: pick(a.dataCategory, DATA_CATEGORIES, true, "IDENTITY"), accessReason: pick(a.accessReason, ACCESS_REASONS, true, "LEGAL_OBLIGATION"),
    accessType: pick(a.accessType, ACCESS_TYPES, true, "VIEW"), ipTruncated: "—",
  };
}

export function toDsrRow(raw: unknown, companies: Names, users: Names, now: Date): DsrRow {
  const r = obj(raw);
  const status = pick(r.status, DSR_STATUSES, true, "RECEIVED");
  const open = status === "RECEIVED" || status === "IN_PROGRESS";
  const due = str(r.dueDate);
  const company = strOrNull(r.companyId);
  return {
    id: str(r.id), requesterName: users.get(str(r.requesterUserId)) ?? "—", companyId: company,
    companyName: company ? (companies.get(company) ?? "—") : "Plateforme", requestType: pick(r.requestType, DSR_TYPES, true, "ACCESS"),
    status, dueDate: due, daysLeft: open && due ? Math.round((Date.parse(due) - now.getTime()) / DAY) : null, overdue: r.overdue === true,
    handledBy: null, createdAt: str(r.createdAt),
  };
}

export function toConsentCards(raw: unknown, companies: Names): ConsentCardData[] {
  return arr(raw).map((c): ConsentCardData => {
    const granted = num(c.granted), withdrawn = num(c.withdrawn);
    const scoped = c.companyScoped === true;
    return {
      consentType: pick<ConsentType>(c.consentType, CONSENT_TYPES, true, "COOKIES_ANALYTICS"), granted, withdrawn,
      rate: granted + withdrawn ? Math.round((granted / (granted + withdrawn)) * 100) : null,
      scopes: arr(c.scopes).map((s) => {
        const id = strOrNull(s.companyId);
        return { name: id ? (companies.get(id) ?? "—") : scoped ? "Sans compagnie (ancien)" : "Plateforme", granted: num(s.granted), withdrawn: num(s.withdrawn) };
      }).sort((a, b) => b.granted + b.withdrawn - a.granted - a.withdrawn),
    };
  });
}

/** Every company is listed: those without a stored policy follow the platform default. */
export function toRetentionRows(raw: unknown, companies: Names): { rows: RetentionRow[]; defaultDays: number } {
  const o = obj(raw);
  const defaultDays = num(o.defaultDays, DEFAULT_RETENTION_DAYS);
  const policies = new Map(arr(o.policies).map((p) => [str(p.companyId), p] as const));
  const ids = new Set([...companies.keys(), ...policies.keys()]);
  const rows = [...ids].map((id): RetentionRow => {
    const p = policies.get(id);
    const days = p ? num(p.retentionDays) : null;
    const pending = p ? num(p.pendingRows) : 0;
    return {
      companyId: id, companyName: companies.get(id) ?? "—", status: "active", configuredDays: days, effectiveDays: days ?? defaultDays,
      isCustom: days !== null, olderRows: pending, pendingRows: pending,
    };
  }).sort((a, b) => a.companyName.localeCompare(b.companyName));
  return { rows, defaultDays };
}

// ---------------------------------------------------------------------------------------------------------

export async function liveAudit(f: { q?: string; companyId?: string; action?: string }): Promise<AuditRow[]> {
  const [rows, companies] = await Promise.all([loadAll("/admin/audit-logs", withFilters(f)), companyNames()]);
  const users = await userNames(rows.map((r) => str(obj(r).actorUserId)));
  return rows.map((r) => toAuditRow(r, companies, users));
}

export async function liveAccess(f: { q?: string; accessType?: string; dataCategory?: string }): Promise<AccessRow[]> {
  const rows = await loadAll("/admin/data-access-logs", withFilters(f));
  const users = await userNames(rows.flatMap((r) => [str(obj(r).accessedByUserId), str(obj(r).dataSubjectId)]));
  return rows.map((r) => toAccessRow(r, users));
}

export async function liveRequests(f: { q?: string; companyId?: string; status?: string; requestType?: string; overdue?: boolean }, now: Date): Promise<DsrRow[]> {
  const [rows, companies] = await Promise.all([loadAll("/admin/data-subject-requests", withFilters({ ...f, overdue: f.overdue ? "true" : undefined })), companyNames()]);
  const users = await userNames(rows.map((r) => str(obj(r).requesterUserId)));
  return rows.map((r) => toDsrRow(r, companies, users, now));
}

export async function liveRequestStats(companyId?: string) {
  const raw = await soft<unknown>(`/admin/data-subject-requests/stats?${withFilters({ companyId })}`);
  const s = obj(raw);
  return { open: num(s.open), overdue: num(s.overdue), dueSoon: num(s.dueSoon), closed: num(s.closed) };
}

export async function liveConsents(): Promise<ConsentCardData[]> {
  const [raw, companies] = await Promise.all([soft<unknown>("/admin/consents/summary"), companyNames()]);
  return toConsentCards(raw, companies);
}

export async function liveConsentUsers(): Promise<ConsentUserOption[]> {
  const rows = await loadAll("/admin/consents/subjects", new URLSearchParams());
  const ids = rows.filter((r): r is string => typeof r === "string");
  const users = await userNames(ids);
  return ids.map((id) => ({ id, label: users.get(id) ?? id })).sort((a, b) => a.label.localeCompare(b.label));
}

export async function liveRetention(): Promise<{ rows: RetentionRow[]; defaultDays: number }> {
  const [raw, companies] = await Promise.all([soft<unknown>("/admin/retention/policies"), companyNames()]);
  return toRetentionRows(raw, companies);
}

export async function liveOverview(companyId: string | undefined, now: Date): Promise<ComplianceOverview> {
  const [auditStats, accessStats, reqStats, urgent, failures, recent, cards, ret] = await Promise.all([
    soft<unknown>(`/admin/audit-logs/stats?${withFilters({ companyId })}`), soft<unknown>("/admin/data-access-logs/stats"),
    liveRequestStats(companyId), liveRequests({ companyId }, now).catch(() => [] as DsrRow[]),
    liveAudit({ companyId, action: "LOGIN_FAILED" }).catch(() => [] as AuditRow[]), liveAccess({}).catch(() => [] as AccessRow[]),
    liveConsents(), liveRetention(),
  ]);
  const a = obj(auditStats), x = obj(accessStats);
  const granted = cards.reduce((n, c) => n + c.granted, 0), withdrawn = cards.reduce((n, c) => n + c.withdrawn, 0);
  const byType = arr(x.byType);
  const rows = companyId ? ret.rows.filter((r) => r.companyId === companyId) : ret.rows;
  return {
    audit: {
      total: num(a.total), last7: num(a.last7), failedLogins: num(a.failedLogins),
      byAction: arr(a.byAction).map((s) => ({ action: pick(s.key, AUDIT_ACTIONS, true, "UPDATE"), value: num(s.count) })),
      recentFailures: failures.slice(0, 4),
    },
    access: {
      total: num(x.total), last7: num(x.last7), exports: byType.filter((s) => str(s.key).toUpperCase() === "EXPORT").reduce((n, s) => n + num(s.count), 0),
      byCategory: arr(x.byCategory).map((s) => ({ category: pick(s.key, DATA_CATEGORIES, true, "IDENTITY"), value: num(s.count) })),
      recent: recent.slice(0, 4),
    },
    requests: { ...reqStats, urgent: urgent.filter((r) => r.daysLeft !== null).slice(0, 5) },
    consents: { granted, withdrawn, rate: granted + withdrawn ? Math.round((granted / (granted + withdrawn)) * 100) : null, byType: cards },
    retention: {
      custom: rows.filter((r) => r.isCustom).length, pending: rows.reduce((n, r) => n + r.pendingRows, 0), defaultDays: ret.defaultDays,
      shortest: [...rows].sort((a2, b) => a2.effectiveDays - b.effectiveDays)[0] ?? null,
    },
  };
}

/** Null counter = its source failed, so the tab shows no badge. */
export async function liveComplianceCounts(q: string, companyId?: string): Promise<Record<ComplianceTab, number | null>> {
  const total = async (path: string, f: Record<string, string | undefined>) => {
    const raw = await soft<unknown>(`${path}?${withFilters({ ...f, size: "1" })}`);
    return raw && typeof raw === "object" ? numOrNull(obj(raw).totalElements) : null;
  };
  const [journal, access, requests, consents, retention] = await Promise.all([
    total("/admin/audit-logs", { q: q || undefined, companyId }), total("/admin/data-access-logs", { q: q || undefined }),
    total("/admin/data-subject-requests", { q: q || undefined, companyId }), liveConsents().then((c) => c.filter((x) => !q || fold(x.consentType + " " + x.scopes.map((y) => y.name).join(" ")).includes(fold(q))).length).catch(() => null),
    liveRetention().then((r) => r.rows.filter((x) => (!companyId || x.companyId === companyId) && (!q || fold(x.companyName).includes(fold(q)))).length).catch(() => null),
  ]);
  return { apercu: 0, "journal-audit": journal, "acces-donnees": access, "demandes-rgpd": requests, consentements: consents, retention };
}

/** Whole-journal figures: the loaded list stops at 500 rows, so the strip reads the stats endpoint instead. */
export async function liveAuditFigures(companyId?: string) {
  const raw = await soft<unknown>(`/admin/audit-logs/stats?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const a = obj(raw);
  return { total: num(a.total), login: num(a.login), failedLogins: num(a.failedLogins), permissionChange: num(a.permissionChange) };
}

import { call } from "@/lib/api/sales-live";
import { ApiError } from "@/lib/api/http";
import type { DsrDetail } from "@/lib/repos/compliance";

/** Opening a request on the platform is itself journaled as an access to personal data (by the platform, not by this page). */
export async function liveDsrDetail(id: string, now: Date): Promise<DsrDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/data-subject-requests/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const r = obj(raw);
  const [companies, users] = await Promise.all([companyNames(), userNames([str(r.requesterUserId), str(r.handledByUserId)])]);
  const row = toDsrRow(r, companies, users, now);
  const handled = strOrNull(r.handledByUserId);
  return {
    request: {
      id: str(r.id), requesterUserId: str(r.requesterUserId), companyId: row.companyId, requestType: row.requestType, status: row.status,
      reason: str(r.reason), handledBy: handled ? (users.get(handled) ?? "—") : null, dueDate: str(r.dueDate), resolvedAt: strOrNull(r.resolvedAt),
      resolutionNotes: strOrNull(r.resolutionNotes), createdAt: str(r.createdAt),
    },
    requesterName: row.requesterName, requesterUserId: str(r.requesterUserId), companyName: row.companyName, daysLeft: row.daysLeft, overdue: row.daysLeft !== null && row.daysLeft < 0,
  };
}
