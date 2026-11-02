import {
  accessRepo, auditRepo, consentsRepo, dsrRepo, retentionRepo, DSR_SOON_DAYS, DEFAULT_RETENTION_DAYS,
  type AccessRow, type AuditRow, type ConsentSummaryRow, type DsrRow, type RetentionRow,
} from "@/lib/repos/compliance";
import { accessReasonLabel, accessTypeLabel, auditActionLabel, consentTypeLabel, dataCategoryLabel, dsrTypeLabel } from "@/lib/labels";
import { getStore } from "@/lib/repos/store";
import type { AccessType, AuditAction, ConsentType, DataCategory, DsrStatus, DsrType } from "@/lib/types";

export const COMPLIANCE_TABS = ["apercu", "journal-audit", "acces-donnees", "demandes-rgpd", "consentements", "retention"] as const;
export type ComplianceTab = (typeof COMPLIANCE_TABS)[number];
const DAY = 86_400_000;

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}
type Co = { companyId?: string };

/** Current consent states of one type, split per scope. */
export interface ConsentCardData {
  consentType: ConsentType; granted: number; withdrawn: number; rate: number | null;
  scopes: { name: string; granted: number; withdrawn: number }[];
}

export interface ComplianceOverview {
  audit: { total: number; last7: number; failedLogins: number; byAction: { action: AuditAction; value: number }[]; recentFailures: AuditRow[] };
  access: { total: number; last7: number; exports: number; byCategory: { category: DataCategory; value: number }[]; recent: AccessRow[] };
  requests: { open: number; overdue: number; dueSoon: number; closed: number; urgent: DsrRow[] };
  consents: { granted: number; withdrawn: number; rate: number | null; byType: ConsentCardData[] };
  retention: { custom: number; pending: number; defaultDays: number; shortest: RetentionRow | null };
}

export const complianceHubRepo = {
  journal(q?: string, f: Co & { action?: AuditAction } = {}): AuditRow[] {
    const hit = matcher(q);
    return auditRepo.listRows(f).filter((a) =>
      hit(a.actorLabel, a.companyName, a.entityType, a.entityRef, a.sourceService, auditActionLabel(a.action)));
  },

  access(q?: string, f: { type?: AccessType; category?: DataCategory } = {}): AccessRow[] {
    const hit = matcher(q);
    return accessRepo.listRows({ accessType: f.type, category: f.category }).filter((a) =>
      hit(a.accessedByLabel, a.subjectName, dataCategoryLabel(a.dataCategory), accessReasonLabel(a.accessReason), accessTypeLabel(a.accessType)));
  },

  requests(q?: string, f: Co & { status?: DsrStatus; type?: DsrType; overdueOnly?: boolean } = {}, now: Date = new Date()): DsrRow[] {
    const hit = matcher(q);
    return dsrRepo.listRows(f, now).filter((r) => hit(r.requesterName, r.companyName, dsrTypeLabel(r.requestType), r.handledBy));
  },

  consents(q?: string): ConsentCardData[] {
    const hit = matcher(q);
    const rows: ConsentSummaryRow[] = consentsRepo.summary();
    const types = [...new Set(rows.map((r) => r.consentType))];
    return types
      .map((t): ConsentCardData => {
        const mine = rows.filter((r) => r.consentType === t);
        const granted = mine.reduce((n, r) => n + r.granted, 0);
        const withdrawn = mine.reduce((n, r) => n + r.withdrawn, 0);
        return {
          consentType: t, granted, withdrawn, rate: granted + withdrawn ? Math.round((granted / (granted + withdrawn)) * 100) : null,
          scopes: mine.map((r) => ({ name: r.companyName, granted: r.granted, withdrawn: r.withdrawn })).sort((a, b) => b.granted + b.withdrawn - a.granted - a.withdrawn),
        };
      })
      .filter((c) => hit(consentTypeLabel(c.consentType), ...c.scopes.map((s) => s.name)));
  },

  retention(q?: string, f: Co & { custom?: boolean } = {}, now: Date = new Date()): RetentionRow[] {
    const hit = matcher(q);
    return retentionRepo.listRows(now)
      .filter((r) => (!f.companyId || r.companyId === f.companyId) && (f.custom === undefined || r.isCustom === f.custom) && hit(r.companyName));
  },

  counts(q?: string, f: Co = {}): Record<ComplianceTab, number> {
    return {
      apercu: 0, "journal-audit": complianceHubRepo.journal(q, f).length, "acces-donnees": complianceHubRepo.access(q).length,
      "demandes-rgpd": complianceHubRepo.requests(q, f).length, consentements: complianceHubRepo.consents(q).length,
      retention: complianceHubRepo.retention(q, f).length,
    };
  },

  overview(f: Co = {}, now: Date = new Date()): ComplianceOverview {
    const s = getStore();
    const since7 = now.getTime() - 7 * DAY;
    const audit = s.auditLogs.filter((a) => !f.companyId || a.companyId === f.companyId);
    const byAction = new Map<AuditAction, number>();
    for (const a of audit) byAction.set(a.action, (byAction.get(a.action) ?? 0) + 1);
    const access = s.dataAccessLogs;
    const byCategory = new Map<DataCategory, number>();
    for (const a of access) byCategory.set(a.dataCategory, (byCategory.get(a.dataCategory) ?? 0) + 1);
    const stats = dsrRepo.stats(now);
    const requests = dsrRepo.listRows({ companyId: f.companyId }, now);
    const cards = complianceHubRepo.consents();
    const granted = cards.reduce((n, c) => n + c.granted, 0);
    const withdrawn = cards.reduce((n, c) => n + c.withdrawn, 0);
    const ret = retentionRepo.listRows(now).filter((r) => !f.companyId || r.companyId === f.companyId);
    return {
      audit: {
        total: audit.length, last7: audit.filter((a) => Date.parse(a.createdAt) >= since7).length,
        failedLogins: audit.filter((a) => a.action === "LOGIN_FAILED").length,
        byAction: [...byAction].map(([action, value]) => ({ action, value })).sort((a, b) => b.value - a.value),
        recentFailures: auditRepo.listRows({ companyId: f.companyId, action: "LOGIN_FAILED" }).slice(0, 4),
      },
      access: {
        total: access.length, last7: access.filter((a) => Date.parse(a.createdAt) >= since7).length,
        exports: access.filter((a) => a.accessType === "EXPORT").length,
        byCategory: [...byCategory].map(([category, value]) => ({ category, value })).sort((a, b) => b.value - a.value),
        recent: accessRepo.listRows().slice(0, 4),
      },
      requests: { ...stats, urgent: requests.filter((r) => r.daysLeft !== null).slice(0, 5) },
      consents: { granted, withdrawn, rate: granted + withdrawn ? Math.round((granted / (granted + withdrawn)) * 100) : null, byType: cards },
      retention: {
        custom: ret.filter((r) => r.isCustom).length, pending: ret.reduce((n, r) => n + r.pendingRows, 0), defaultDays: DEFAULT_RETENTION_DAYS,
        shortest: [...ret].sort((a, b) => a.effectiveDays - b.effectiveDays)[0] ?? null,
      },
    };
  },
};

export { DSR_SOON_DAYS };
