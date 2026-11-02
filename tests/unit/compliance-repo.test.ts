import { beforeEach, describe, expect, it } from "vitest";
import {
  accessRepo, auditRepo, consentsRepo, dsrDaysLeft, dsrRepo, dsrTransitionBlock, effectiveRetentionDays, retentionRepo,
} from "@/lib/repos/compliance";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DataSubjectRequest } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const dsrOf = (name: string, type: DataSubjectRequest["requestType"]) => {
  const s = getStore();
  return s.dataSubjectRequests.find(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  )!;
};
const companyNamed = (name: string) => getStore().companies.find((c) => c.name === name)!;

describe("audit log", () => {
  it("lists every line newest first and filters by company and action", () => {
    const s = getStore();
    const all = auditRepo.listRows({});
    expect(all).toHaveLength(s.auditLogs.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const companyId = s.auditLogs.find((a) => a.companyId)!.companyId!;
    const mine = auditRepo.listRows({ companyId });
    expect(mine.length).toBeGreaterThan(0);
    expect(mine.every((r) => r.companyId === companyId)).toBe(true);
    const logins = auditRepo.listRows({ action: "LOGIN" });
    expect(logins).toHaveLength(s.sessions.length);
    expect(logins.every((r) => r.action === "LOGIN")).toBe(true);
    expect(auditRepo.listRows({ companyId, action: "CREATE" }).every((r) => r.companyId === companyId && r.action === "CREATE")).toBe(true);
  });

  it("exposes only client-safe fields and a truncated IP, never the user agent or the states", () => {
    const rows = auditRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "action", "actorLabel", "actorType", "companyId", "companyName", "createdAt", "entityRef", "entityType", "id",
      "ipTruncated", "sourceService",
    ]);
    const login = auditRepo.listRows({ action: "LOGIN" })[0]!;
    const source = getStore().auditLogs.find((a) => a.id === login.id)!;
    expect(login.ipTruncated).toBe(source.ipAddress!.replace(/\.\d+$/, ".0"));
    expect(JSON.stringify(rows)).not.toContain(source.ipAddress!);
    expect(JSON.stringify(rows)).not.toContain(source.userAgent!);
  });

  it("names the actor and says 'Plateforme' and '—' where there is no company or no origin", () => {
    const s = getStore();
    const purge = auditRepo.listRows({}).find((r) => r.entityType === "RetentionPurge")!;
    expect(purge.companyName).toBe("Plateforme");
    expect(purge.actorLabel).toBe("Système");
    expect(purge.ipTruncated).toBe("—");
    const login = s.auditLogs.find((a) => a.action === "LOGIN")!;
    expect(auditRepo.listRows({ action: "LOGIN" }).find((r) => r.id === login.id)!.actorLabel)
      .toBe(s.users.find((u) => u.id === login.actorUserId)!.displayName);
  });

  it("returns a before/after table with the changed fields flagged, undefined when unknown", () => {
    const s = getStore();
    expect(auditRepo.detail("00000000-0000-4000-8000-000000000000")).toBeUndefined();
    const activation = s.auditLogs.find((a) => a.entityType === "Company" && a.action === "UPDATE")!;
    const d = auditRepo.detail(activation.id)!;
    expect(d.entityId).toBe(activation.entityId);
    expect(d.changes.map((c) => c.key)).toEqual(["forceActivated", "status"]);
    const status = d.changes.find((c) => c.key === "status")!;
    expect(status).toEqual({ key: "status", before: "DRAFT", after: "ACTIVE", changed: true });
    expect(d.changes.some((c) => c.key === "forceActivated" && c.changed === (c.before !== c.after))).toBe(true);
    const creation = auditRepo.detail(s.auditLogs.find((a) => a.action === "CREATE" && a.entityType === "Company")!.id)!;
    expect(creation.changes).toEqual([{ key: "status", before: null, after: "DRAFT", changed: true }]);
    const login = auditRepo.detail(s.auditLogs.find((a) => a.action === "LOGIN")!.id)!;
    expect(login.changes).toEqual([]);
  });

  it("shows the user agent on the detail only, and a dash once anonymised", () => {
    const s = getStore();
    const fresh = s.auditLogs.find((a) => a.userAgent !== null)!;
    expect(auditRepo.detail(fresh.id)!.userAgent).toBe(fresh.userAgent);
    const anonymised = s.auditLogs.find((a) => a.actorType === "USER" && a.userAgent === null)!;
    expect(auditRepo.detail(anonymised.id)!.userAgent).toBe("—");
    expect(auditRepo.detail(anonymised.id)!.row.ipTruncated).toBe("—");
  });

  it("is read-only: the repository offers no way to change a line", () => {
    expect(Object.keys(auditRepo).sort()).toEqual(["detail", "listRows"]);
    expect(Object.keys(accessRepo).sort()).toEqual(["listRows"]);
  });
});

describe("data access log", () => {
  it("lists accesses newest first and filters by type and category", () => {
    const s = getStore();
    const all = accessRepo.listRows({});
    expect(all).toHaveLength(s.dataAccessLogs.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.createdAt >= all[i]!.createdAt).toBe(true);
    const exports = accessRepo.listRows({ accessType: "EXPORT" });
    expect(exports.length).toBeGreaterThan(0);
    expect(exports.every((r) => r.accessType === "EXPORT")).toBe(true);
    const consent = accessRepo.listRows({ category: "CONSENT" });
    expect(consent).toHaveLength(3);
    expect(accessRepo.listRows({ accessType: "EXPORT", category: "CONSENT" })).toHaveLength(0);
  });

  it("names who and whom, truncates the IP and exposes only client-safe fields", () => {
    const s = getStore();
    const rows = accessRepo.listRows({});
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "accessReason", "accessType", "accessedByLabel", "createdAt", "dataCategory", "id", "ipTruncated", "subjectName", "subjectType",
    ]);
    const source = s.dataAccessLogs.find((l) => l.id === rows[0]!.id)!;
    expect(rows[0]!.subjectName).toBe(s.users.find((u) => u.id === source.dataSubjectId)!.displayName);
    expect(rows[0]!.accessedByLabel).toBe(s.users.find((u) => u.id === source.accessedByUserId)!.displayName);
    expect(rows[0]!.ipTruncated).toMatch(/\.0$/);
    expect(JSON.stringify(rows)).not.toContain(source.ipAddress!);
    expect(JSON.stringify(rows)).not.toContain(source.dataSubjectId);
  });
});

describe("legal deadline", () => {
  it("counts the days left of an open request and nothing for a closed one", () => {
    const overdue = dsrOf("Pape Mbaye", "RECTIFICATION");
    expect(dsrDaysLeft(overdue, NOW)).toBe(-2);
    expect(dsrDaysLeft(dsrOf("Ndèye Diouf", "ACCESS"), NOW)).toBe(20);
    expect(dsrDaysLeft(dsrOf("Aïssatou Sarr", "PORTABILITY"), NOW)).toBeNull();
    expect(dsrDaysLeft(dsrOf("Lamine Camara", "ACCESS"), NOW)).toBeNull();
  });

  it("rounds up to the next day and moves with the injected clock", () => {
    const r = dsrOf("Ndèye Diouf", "ACCESS");
    const due = Date.parse(r.dueDate);
    expect(dsrDaysLeft(r, new Date(due - DAY / 2))).toBe(1);
    expect(dsrDaysLeft(r, new Date(due))).toBe(0);
    expect(dsrDaysLeft(r, new Date(due + 1))).toBe(0);
    expect(dsrDaysLeft(r, new Date(due + DAY))).toBe(-1);
  });

  it("explains which transitions the workflow refuses", () => {
    const received = dsrOf("Ndèye Diouf", "ACCESS");
    const inProgress = dsrOf("Lamine Camara", "ERASURE");
    const closed = dsrOf("Aïssatou Sarr", "PORTABILITY");
    expect(dsrTransitionBlock(received, "IN_PROGRESS")).toBeNull();
    expect(dsrTransitionBlock(received, "COMPLETED")).toBe("Une demande reçue doit d'abord être prise en charge");
    expect(dsrTransitionBlock(received, "REJECTED")).toBe("Une demande reçue doit d'abord être prise en charge");
    expect(dsrTransitionBlock(inProgress, "IN_PROGRESS")).toBe("Cette demande est déjà prise en charge");
    expect(dsrTransitionBlock(inProgress, "COMPLETED")).toBeNull();
    expect(dsrTransitionBlock(inProgress, "REJECTED")).toBeNull();
    for (const target of ["IN_PROGRESS", "COMPLETED", "REJECTED"] as const) {
      expect(dsrTransitionBlock(closed, target)).toBe("Cette demande est déjà close");
    }
  });
});

describe("data-subject requests", () => {
  it("lists requests with their deadline, soonest first, and filters", () => {
    const s = getStore();
    const all = dsrRepo.listRows({}, NOW);
    expect(all).toHaveLength(s.dataSubjectRequests.length);
    const open = all.filter((r) => r.daysLeft !== null);
    for (let i = 1; i < open.length; i++) expect(open[i - 1]!.daysLeft! <= open[i]!.daysLeft!).toBe(true);
    expect(all.slice(0, open.length).every((r) => r.daysLeft !== null)).toBe(true);
    expect(dsrRepo.listRows({ status: "COMPLETED" }, NOW).every((r) => r.status === "COMPLETED")).toBe(true);
    expect(dsrRepo.listRows({ type: "ERASURE" }, NOW).every((r) => r.requestType === "ERASURE")).toBe(true);
    const late = dsrRepo.listRows({ overdueOnly: true }, NOW);
    expect(late).toHaveLength(1);
    expect(late[0]).toMatchObject({ requesterName: "Pape Mbaye", requestType: "RECTIFICATION", overdue: true, daysLeft: -2 });
    const companyId = s.dataSubjectRequests.find((r) => r.companyId)!.companyId!;
    expect(dsrRepo.listRows({ companyId }, NOW).every((r) => r.companyId === companyId)).toBe(true);
  });

  it("exposes only client-safe fields (no reason, no notes, no identifier of the requester)", () => {
    const row = dsrRepo.listRows({}, NOW)[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "companyId", "companyName", "createdAt", "daysLeft", "dueDate", "handledBy", "id", "overdue", "requestType",
      "requesterName", "status",
    ]);
    const text = JSON.stringify(dsrRepo.listRows({}, NOW));
    for (const r of getStore().dataSubjectRequests) {
      expect(text).not.toContain(r.reason);
      expect(text).not.toContain(r.requesterUserId);
    }
  });

  it("counts open, overdue, soon-due and closed requests", () => {
    const s = getStore();
    const stats = dsrRepo.stats(NOW);
    const open = s.dataSubjectRequests.filter((r) => r.status === "RECEIVED" || r.status === "IN_PROGRESS");
    expect(stats.open).toBe(open.length);
    expect(stats.closed).toBe(s.dataSubjectRequests.length - open.length);
    expect(stats.overdue).toBe(1);
    expect(stats.dueSoon).toBe(open.filter((r) => Date.parse(r.dueDate) >= NOW.getTime() && Date.parse(r.dueDate) - NOW.getTime() <= 7 * DAY).length);
    expect(stats.dueSoon).toBe(1);
  });

  it("returns the full detail for the server and undefined for an unknown request", () => {
    expect(dsrRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
    const target = dsrOf("Lamine Camara", "ERASURE");
    const d = dsrRepo.detail(target.id, NOW)!;
    expect(d.request.reason).toBe(target.reason);
    expect(d.requesterName).toBe("Lamine Camara");
    expect(d.requesterUserId).toBe(target.requesterUserId);
    expect(d.daysLeft).toBe(3);
    expect(d.overdue).toBe(false);
    expect(dsrRepo.detail(dsrOf("Pape Mbaye", "RECTIFICATION").id, NOW)!.overdue).toBe(true);
    expect(dsrRepo.detail(dsrOf("Aïssatou Sarr", "PORTABILITY").id, NOW)!.daysLeft).toBeNull();
  });
});

describe("consents", () => {
  it("summarises the current state of each user, type and company, ignoring superseded rows", () => {
    const s = getStore();
    const rows = consentsRepo.summary();
    const latest = new Map<string, (typeof s.consentRecords)[number]>();
    for (const r of [...s.consentRecords].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
      latest.set(`${r.userId}|${r.consentType}|${r.companyId ?? ""}`, r);
    }
    const current = [...latest.values()];
    expect(rows.reduce((n, r) => n + r.granted, 0)).toBe(current.filter((r) => r.status === "GRANTED").length);
    expect(rows.reduce((n, r) => n + r.withdrawn, 0)).toBe(current.filter((r) => r.status === "WITHDRAWN").length);
    expect(rows.reduce((n, r) => n + r.withdrawn, 0)).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(s.consentRecords.length);
    expect(Object.keys(rows[0]!).sort()).toEqual(["companyName", "consentType", "granted", "withdrawn"]);
  });

  it("names the scope of each summary line: a company, the platform, or a legacy marketing row", () => {
    const rows = consentsRepo.summary();
    expect(rows.filter((r) => r.companyName === "Sans compagnie (ancien)")).toHaveLength(1);
    expect(rows.find((r) => r.consentType === "COOKIES_ANALYTICS")!.companyName).toBe("Plateforme");
    expect(rows.some((r) => r.consentType === "MARKETING_SMS" && r.companyName !== "Plateforme")).toBe(true);
  });

  it("keeps the latest consent as current even when it was stored before an older one", () => {
    const s = getStore();
    const base = s.consentRecords.find((r) => r.consentType === "COOKIES_ANALYTICS")!;
    const mk = (id: string, status: "GRANTED" | "WITHDRAWN", at: string) => ({ ...base, id, status, createdAt: at });
    const newer = mk("zz-newer", "WITHDRAWN", NOW.toISOString());
    const older = mk("zz-older", "GRANTED", new Date(NOW.getTime() - DAY).toISOString());
    s.consentRecords.push(newer, older); // newer stored first, older appended after
    const view = consentsRepo.consult(base.userId, "SUPPORT_REQUEST", "t", NOW);
    const same = view.filter((e) => e.consentType === "COOKIES_ANALYTICS" && e.companyName === null);
    expect(same.find((e) => e.id === "zz-newer")!.isCurrent).toBe(true);
    expect(same.find((e) => e.id === "zz-older")!.isCurrent).toBe(false);
    expect(same.filter((e) => e.isCurrent)).toHaveLength(1);
  });

  it("offers the users who have at least one consent, labelled without contact data", () => {
    const s = getStore();
    const options = consentsRepo.userOptions();
    const withConsent = new Set(s.consentRecords.map((r) => r.userId));
    expect(options.map((o) => o.id).sort()).toEqual([...withConsent].sort());
    expect(options.find((o) => o.label === "Aïssatou Sarr (client)")).toBeDefined();
    expect(JSON.stringify(options)).not.toMatch(/@|\+221/);
    expect(Object.keys(options[0]!).sort()).toEqual(["id", "label"]);
  });
});

describe("retention", () => {
  it("uses the company's own duration or the 730 day default", () => {
    expect(effectiveRetentionDays({ dataRetentionDays: 365 })).toBe(365);
    expect(effectiveRetentionDays({ dataRetentionDays: null })).toBe(730);
  });

  it("lists every company with its duration and counts the lines older than it and not yet anonymised", () => {
    const s = getStore();
    const rows = retentionRepo.listRows(NOW);
    expect(rows).toHaveLength(s.companies.length);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "companyId", "companyName", "configuredDays", "effectiveDays", "isCustom", "olderRows", "pendingRows", "status",
    ]);
    for (const r of rows) {
      const company = s.companies.find((c) => c.id === r.companyId)!;
      expect(r.effectiveDays).toBe(company.dataRetentionDays ?? 730);
      expect(r.isCustom).toBe(company.dataRetentionDays !== null);
      const older = s.auditLogs.filter((a) => a.companyId === r.companyId && NOW.getTime() - Date.parse(a.createdAt) > r.effectiveDays * DAY);
      expect(r.olderRows).toBe(older.length);
      expect(r.pendingRows).toBe(older.filter((a) => a.ipAddress !== null).length);
      expect(r.pendingRows).toBe(0);
    }
    expect(rows.some((r) => r.olderRows > 0)).toBe(true);
  });

  it("sees lines become pending when the retention is shortened and when the clock moves", () => {
    const casamance = companyNamed("Casamance Trans");
    const rowOf = (at: Date) => retentionRepo.listRows(at).find((r) => r.companyId === casamance.id);
    expect(rowOf(NOW)).toMatchObject({ olderRows: 0, pendingRows: 0, effectiveDays: 730 });
    casamance.dataRetentionDays = 90;
    // 4 lines older than 90 days; 3 of them still carry an IP (the system activation line has none)
    expect(rowOf(NOW)).toMatchObject({ olderRows: 4, pendingRows: 3, effectiveDays: 90, configuredDays: 90, isCustom: true });
    casamance.dataRetentionDays = null;
    // 500 days later, against the 730 day default
    expect(rowOf(new Date(NOW.getTime() + 500 * DAY))).toMatchObject({ olderRows: 3, pendingRows: 2, effectiveDays: 730 });
  });

  it("counts a line only once it is strictly older than the retention (exact boundary excluded)", () => {
    const s = getStore();
    const company = companyNamed("Baobab Lines");
    company.dataRetentionDays = 100;
    const line = (id: string, ageMs: number, ip: string | null) => ({
      id, actorUserId: null, actorLabel: "t", actorType: "USER" as const, action: "UPDATE" as const, entityType: "X",
      entityId: id, companyId: company.id, beforeState: null, afterState: null, sourceService: null, ipAddress: ip,
      userAgent: null, occurredAt: null, createdAt: new Date(NOW.getTime() - ageMs).toISOString(),
    });
    const rowOf = () => retentionRepo.listRows(NOW).find((r) => r.companyId === company.id)!;
    const before = rowOf();
    s.auditLogs.push(line("edge-exact", 100 * DAY, "10.0.0.1"));
    expect(rowOf()).toMatchObject({ olderRows: before.olderRows, pendingRows: before.pendingRows });
    s.auditLogs.push(line("edge-older", 100 * DAY + 1, "10.0.0.2"));
    expect(rowOf()).toMatchObject({ olderRows: before.olderRows + 1, pendingRows: before.pendingRows + 1 });
    s.auditLogs.push(line("edge-older-noip", 100 * DAY + 1, null));
    expect(rowOf()).toMatchObject({ olderRows: before.olderRows + 2, pendingRows: before.pendingRows + 1 });
  });

  it("with its own 365 days, Sahel Express has two old lines, both already anonymised", () => {
    const sahel = companyNamed("Sahel Express");
    expect(retentionRepo.listRows(NOW).find((r) => r.companyId === sahel.id)).toMatchObject({
      olderRows: 2, pendingRows: 0, effectiveDays: 365, isCustom: true,
    });
  });
});
