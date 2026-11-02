import { truncateIp } from "@/lib/mask";
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  AccessReason, AccessType, AuditAction, AuditActorType, AuditLog, Company, ConsentRecord, ConsentSource,
  ConsentStatus, ConsentType, DataAccessLog, DataCategory, DataSubjectRequest, DataSubjectType, DsrStatus, DsrType,
  PlatformUser,
} from "@/lib/types";

export const DEFAULT_RETENTION_DAYS = 730;
export const MIN_RETENTION_DAYS = 90;
export const MAX_RETENTION_DAYS = 3650;
/** An open request is "due soon" when its deadline is within this many days. */
export const DSR_SOON_DAYS = 7;

export const AUDIT_ACTIONS = ["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGIN_FAILED", "EXPORT", "PERMISSION_CHANGE"] as const;
export const ACCESS_TYPES = ["VIEW", "EXPORT", "MODIFY", "DELETE"] as const;
export const DATA_CATEGORIES = ["IDENTITY", "FINANCIAL", "LOCATION", "HEALTH", "CONTACT", "CONSENT"] as const;
export const DSR_STATUSES = ["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"] as const;
export const DSR_TYPES = ["ACCESS", "RECTIFICATION", "ERASURE", "PORTABILITY", "RESTRICTION", "OBJECTION"] as const;
export const ACCESS_REASONS = ["SUPPORT_REQUEST", "LEGAL_OBLIGATION", "SERVICE_DELIVERY", "INVESTIGATION"] as const;

const DAY = 86_400_000;

/** Client-safe projection of an audit line: truncated IP, no user agent, no states. */
export interface AuditRow {
  id: string; createdAt: string; companyId: string | null; companyName: string; actorLabel: string;
  actorType: AuditActorType; action: AuditAction; entityType: string; entityRef: string;
  sourceService: string | null; ipTruncated: string;
}

export interface AuditChange { key: string; before: string | null; after: string | null; changed: boolean }

export interface AuditDetail {
  row: AuditRow;
  entityId: string;
  userAgent: string;
  occurredAt: string | null;
  changes: AuditChange[];
}

export interface AccessRow {
  id: string; createdAt: string; accessedByLabel: string; subjectType: DataSubjectType; subjectName: string;
  dataCategory: DataCategory; accessReason: AccessReason; accessType: AccessType; ipTruncated: string;
}

/** Client-safe projection of a request: no reason, no notes, no requester identifier. */
export interface DsrRow {
  id: string; requesterName: string; companyId: string | null; companyName: string; requestType: DsrType;
  status: DsrStatus; dueDate: string; daysLeft: number | null; overdue: boolean; handledBy: string | null; createdAt: string;
}

export interface DsrStats { open: number; overdue: number; dueSoon: number; closed: number }

export interface DsrDetail {
  request: DataSubjectRequest;
  requesterName: string;
  requesterUserId: string;
  companyName: string;
  daysLeft: number | null;
  overdue: boolean;
}

export interface ConsentSummaryRow { consentType: ConsentType; companyName: string; granted: number; withdrawn: number }
export interface ConsentUserOption { id: string; label: string }

export interface ConsentEntryView {
  id: string; consentType: ConsentType; companyName: string | null; status: ConsentStatus;
  consentVersion: string; source: ConsentSource; at: string; isCurrent: boolean;
}

export interface RetentionRow {
  companyId: string; companyName: string; status: Company["status"]; configuredDays: number | null;
  effectiveDays: number; isCustom: boolean; olderRows: number; pendingRows: number;
}

export function effectiveRetentionDays(company: Pick<Company, "dataRetentionDays">): number {
  return company.dataRetentionDays ?? DEFAULT_RETENTION_DAYS;
}

function isOpen(request: Pick<DataSubjectRequest, "status">): boolean {
  return request.status === "RECEIVED" || request.status === "IN_PROGRESS";
}

/** Days left before the legal deadline, rounded up; `null` for a closed request. */
export function dsrDaysLeft(request: DataSubjectRequest, now: Date): number | null {
  if (!isOpen(request)) return null;
  return Math.ceil((Date.parse(request.dueDate) - now.getTime()) / DAY) || 0; // `|| 0` turns -0 into 0
}

/** Why a request cannot move to `target`, `null` when it can. Same order as the transition guards. */
export function dsrTransitionBlock(request: Pick<DataSubjectRequest, "status">, target: DsrStatus): string | null {
  if (!isOpen(request)) return "Cette demande est déjà close";
  if (target === "IN_PROGRESS") return request.status === "IN_PROGRESS" ? "Cette demande est déjà prise en charge" : null;
  return request.status === "RECEIVED" ? "Une demande reçue doit d'abord être prise en charge" : null;
}

function companyName(companyId: string | null, fallback = "Plateforme"): string {
  if (!companyId) return fallback;
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function userName(userId: string | null): string | null {
  return userId ? getStore().users.find((u) => u.id === userId)?.displayName ?? null : null;
}

export function subjectTypeOf(user: PlatformUser): DataSubjectType {
  return user.companyId !== null ? "EMPLOYEE" : user.roleCode === "USER" ? "CUSTOMER" : "USER";
}

const newest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

function auditRow(a: AuditLog): AuditRow {
  return {
    id: a.id, createdAt: a.createdAt, companyId: a.companyId, companyName: companyName(a.companyId),
    actorLabel: a.actorLabel ?? userName(a.actorUserId) ?? "Système", actorType: a.actorType, action: a.action,
    entityType: a.entityType, entityRef: a.entityId.slice(0, 8), sourceService: a.sourceService,
    ipTruncated: a.ipAddress ? truncateIp(a.ipAddress) : "—",
  };
}

function accessRow(l: DataAccessLog): AccessRow {
  return {
    id: l.id, createdAt: l.createdAt, accessedByLabel: l.accessedByLabel ?? userName(l.accessedByUserId) ?? "—",
    subjectType: l.dataSubjectType, subjectName: userName(l.dataSubjectId) ?? "Compte supprimé",
    dataCategory: l.dataCategory, accessReason: l.accessReason, accessType: l.accessType,
    ipTruncated: l.ipAddress ? truncateIp(l.ipAddress) : "—",
  };
}

function dsrRow(r: DataSubjectRequest, now: Date): DsrRow {
  const daysLeft = dsrDaysLeft(r, now);
  return {
    id: r.id, requesterName: userName(r.requesterUserId) ?? "—", companyId: r.companyId,
    companyName: companyName(r.companyId, "—"), requestType: r.requestType, status: r.status,
    dueDate: r.dueDate, daysLeft, overdue: daysLeft !== null && daysLeft < 0, handledBy: r.handledBy, createdAt: r.createdAt,
  };
}

/** Latest row of each (user, type, company): the current consent state. */
function currentConsents(): ConsentRecord[] {
  const latest = new Map<string, ConsentRecord>();
  const ordered = [...getStore().consentRecords].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const r of ordered) latest.set(`${r.userId}|${r.consentType}|${r.companyId ?? ""}`, r);
  return [...latest.values()];
}

let appendSeq = 1;

/** The only way a backoffice action adds to the audit trail; existing lines are never touched. */
function appendAudit(
  row: Pick<AuditLog, "companyId" | "action" | "entityType" | "entityId" | "beforeState" | "afterState" | "sourceService">,
  actor: string, now: Date,
): void {
  getStore().auditLogs.push({
    id: `audit-${now.getTime()}-${appendSeq++}`, actorUserId: null, actorLabel: actor, actorType: "USER",
    ipAddress: null, userAgent: null, occurredAt: now.toISOString(), createdAt: now.toISOString(), ...row,
  });
}

function appendAccess(
  row: Pick<DataAccessLog, "dataSubjectType" | "dataSubjectId" | "dataCategory" | "accessReason" | "accessType">,
  actor: string, now: Date,
): void {
  getStore().dataAccessLogs.push({
    id: `access-${now.getTime()}-${appendSeq++}`, accessedByUserId: null, accessedByLabel: actor,
    ipAddress: null, createdAt: now.toISOString(), ...row,
  });
}

const DSR_STATUS_TEXT: Record<DsrStatus, string> = {
  RECEIVED: "reçue", IN_PROGRESS: "en cours", COMPLETED: "clôturée", REJECTED: "rejetée",
};
const DSR_TYPE_TEXT: Record<DsrType, string> = {
  ACCESS: "Accès", RECTIFICATION: "Rectification", ERASURE: "Effacement",
  PORTABILITY: "Portabilité", RESTRICTION: "Limitation", OBJECTION: "Opposition",
};

export const auditRepo = {
  listRows(filter: { companyId?: string; action?: AuditAction } = {}): AuditRow[] {
    return getStore().auditLogs
      .filter((a) => (!filter.companyId || a.companyId === filter.companyId) && (!filter.action || a.action === filter.action))
      .sort(newest((a) => a.createdAt))
      .map(auditRow);
  },

  detail(id: string): AuditDetail | undefined {
    const a = getStore().auditLogs.find((x) => x.id === id);
    if (!a) return undefined;
    const keys = [...new Set([...Object.keys(a.beforeState ?? {}), ...Object.keys(a.afterState ?? {})])].sort();
    return {
      row: auditRow(a), entityId: a.entityId, userAgent: a.userAgent ?? "—", occurredAt: a.occurredAt,
      changes: keys.map((key) => {
        const before = a.beforeState?.[key] ?? null;
        const after = a.afterState?.[key] ?? null;
        return { key, before, after, changed: before !== after };
      }),
    };
  },
};

export const accessRepo = {
  listRows(filter: { accessType?: AccessType; category?: DataCategory } = {}): AccessRow[] {
    return getStore().dataAccessLogs
      .filter((l) => (!filter.accessType || l.accessType === filter.accessType) && (!filter.category || l.dataCategory === filter.category))
      .sort(newest((l) => l.createdAt))
      .map(accessRow);
  },
};

export const dsrRepo = {
  /** Open requests first, soonest deadline first; closed requests after, newest first. */
  listRows(
    filter: { status?: DsrStatus; type?: DsrType; companyId?: string; overdueOnly?: boolean } = {}, now: Date = new Date(),
  ): DsrRow[] {
    const rows = getStore().dataSubjectRequests
      .filter((r) =>
        (!filter.status || r.status === filter.status) &&
        (!filter.type || r.requestType === filter.type) &&
        (!filter.companyId || r.companyId === filter.companyId))
      .map((r) => dsrRow(r, now))
      .filter((r) => !filter.overdueOnly || r.overdue);
    const open = rows.filter((r) => r.daysLeft !== null).sort((a, b) => a.daysLeft! - b.daysLeft! || a.id.localeCompare(b.id));
    const closed = rows.filter((r) => r.daysLeft === null).sort(newest((r) => r.createdAt));
    return [...open, ...closed];
  },

  get(id: string): DataSubjectRequest | undefined {
    return getStore().dataSubjectRequests.find((r) => r.id === id);
  },

  stats(now: Date = new Date()): DsrStats {
    const list = getStore().dataSubjectRequests;
    const open = list.filter(isOpen);
    return {
      open: open.length,
      overdue: open.filter((r) => dsrDaysLeft(r, now)! < 0).length,
      dueSoon: open.filter((r) => dsrDaysLeft(r, now)! >= 0 && dsrDaysLeft(r, now)! <= DSR_SOON_DAYS).length,
      closed: list.length - open.length,
    };
  },

  detail(id: string, now: Date = new Date()): DsrDetail | undefined {
    const request = getStore().dataSubjectRequests.find((r) => r.id === id);
    if (!request) return undefined;
    const daysLeft = dsrDaysLeft(request, now);
    return {
      request, requesterName: userName(request.requesterUserId) ?? "—", requesterUserId: request.requesterUserId,
      companyName: companyName(request.companyId, "—"), daysLeft, overdue: daysLeft !== null && daysLeft < 0,
    };
  },

  /**
   * Moves a request along the workflow. Guards, in this order: request exists, resolution notes (required to close
   * or reject), transition allowed. Writes an audit line, a data-access line and an activity entry.
   */
  transition(
    requestId: string, target: DsrStatus, notes: string, actor = "admin@sira.app", now: Date = new Date(),
  ): DataSubjectRequest {
    const s = getStore();
    const request = s.dataSubjectRequests.find((r) => r.id === requestId);
    if (!request) throw new Error("Demande introuvable");
    const text = notes.trim();
    if (target !== "IN_PROGRESS" && !text) throw new Error("Des notes de résolution sont obligatoires");
    const blocked = dsrTransitionBlock(request, target);
    if (blocked) throw new Error(blocked);
    const previous = request.status;
    request.status = target;
    request.handledBy = actor;
    if (target !== "IN_PROGRESS") {
      request.resolvedAt = now.toISOString();
      request.resolutionNotes = text;
    }
    appendAudit({
      companyId: request.companyId, action: "UPDATE", entityType: "DataSubjectRequest", entityId: request.id,
      beforeState: { status: previous }, afterState: { status: target }, sourceService: "audit-compliance-service",
    }, actor, now);
    const subject = s.users.find((u) => u.id === request.requesterUserId);
    appendAccess({
      dataSubjectType: subject ? subjectTypeOf(subject) : "USER", dataSubjectId: request.requesterUserId,
      dataCategory: "IDENTITY", accessReason: "LEGAL_OBLIGATION", accessType: "MODIFY",
    }, actor, now);
    addActivity(
      request.companyId, actor,
      `Demande RGPD (${DSR_TYPE_TEXT[request.requestType]}) : ${DSR_STATUS_TEXT[previous]} → ${DSR_STATUS_TEXT[target]}`, now,
    );
    return request;
  },
};

export const consentsRepo = {
  /** Current consent states counted per type and company (or scope). */
  summary(): ConsentSummaryRow[] {
    const groups = new Map<string, ConsentSummaryRow>();
    for (const r of currentConsents()) {
      const name = r.companyId
        ? companyName(r.companyId)
        : r.consentType === "MARKETING_EMAIL" || r.consentType === "MARKETING_SMS" ? "Sans compagnie (ancien)" : "Plateforme";
      const key = `${r.consentType}|${name}`;
      const row = groups.get(key) ?? { consentType: r.consentType, companyName: name, granted: 0, withdrawn: 0 };
      if (r.status === "GRANTED") row.granted++;
      else row.withdrawn++;
      groups.set(key, row);
    }
    return [...groups.values()].sort((a, b) => a.consentType.localeCompare(b.consentType) || a.companyName.localeCompare(b.companyName));
  },

  userOptions(): ConsentUserOption[] {
    const s = getStore();
    const ids = new Set(s.consentRecords.map((r) => r.userId));
    return s.users
      .filter((u) => ids.has(u.id))
      .map((u) => ({ id: u.id, label: `${u.displayName} (${u.companyId ? companyName(u.companyId) : "client"})` }))
      .sort((a, b) => a.label.localeCompare(b.label));
  },

  /**
   * Reads a user's consent history on behalf of the platform. Guards, in this order: valid access reason, user
   * exists. A refused call writes nothing; a successful one adds a `VIEW` / `CONSENT` line to the data-access log.
   */
  consult(userId: string, accessReason: string, actor = "admin@sira.app", now: Date = new Date()): ConsentEntryView[] {
    const s = getStore();
    if (!(ACCESS_REASONS as readonly string[]).includes(accessReason)) throw new Error("Motif d'accès invalide");
    const user = s.users.find((u) => u.id === userId);
    if (!user) throw new Error("Utilisateur introuvable");
    appendAccess({
      dataSubjectType: subjectTypeOf(user), dataSubjectId: user.id, dataCategory: "CONSENT",
      accessReason: accessReason as AccessReason, accessType: "VIEW",
    }, actor, now);
    const current = new Set(currentConsents().map((r) => r.id));
    return s.consentRecords
      .filter((r) => r.userId === userId)
      .sort(newest((r) => r.createdAt))
      .map((r): ConsentEntryView => ({
        id: r.id, consentType: r.consentType, companyName: r.companyId ? companyName(r.companyId) : null,
        status: r.status, consentVersion: r.consentVersion, source: r.source, at: r.createdAt, isCurrent: current.has(r.id),
      }));
  },
};

export const retentionRepo = {
  listRows(now: Date = new Date()): RetentionRow[] {
    const s = getStore();
    return s.companies
      .map((c): RetentionRow => {
        const effectiveDays = effectiveRetentionDays(c);
        const older = s.auditLogs.filter((a) => a.companyId === c.id && now.getTime() - Date.parse(a.createdAt) > effectiveDays * DAY);
        return {
          companyId: c.id, companyName: c.name, status: c.status, configuredDays: c.dataRetentionDays, effectiveDays,
          isCustom: c.dataRetentionDays !== null, olderRows: older.length,
          pendingRows: older.filter((a) => a.ipAddress !== null).length,
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  },

  /**
   * Sets a company's retention. Guards, in this order: company exists, reason, whole number of days between 90
   * and 3650, different from the current effective duration. Shortening it makes older lines due for anonymisation
   * at the next run of the daily job (not simulated).
   */
  set(companyId: string, days: number, reason: string, actor = "admin@sira.app", now: Date = new Date()): Company {
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (!Number.isInteger(days) || days < MIN_RETENTION_DAYS || days > MAX_RETENTION_DAYS) {
      throw new Error(`La durée doit être un nombre entier de jours compris entre ${MIN_RETENTION_DAYS} et ${MAX_RETENTION_DAYS}`);
    }
    const effective = effectiveRetentionDays(company);
    if (days === effective) throw new Error(`La durée de rétention est déjà de ${effective} jours`);
    const previous = company.dataRetentionDays;
    company.dataRetentionDays = days;
    appendAudit({
      companyId: company.id, action: "UPDATE", entityType: "Company", entityId: company.id,
      beforeState: { dataRetentionDays: previous === null ? "null" : String(previous) },
      afterState: { dataRetentionDays: String(days) }, sourceService: "company-service",
    }, actor, now);
    addActivity(company.id, actor, `Durée de rétention de ${company.name} : ${effective} → ${days} jours. Motif : ${motif}`, now);
    return company;
  },
};
