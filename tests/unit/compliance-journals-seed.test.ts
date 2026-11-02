import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { AuditLog } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const retentionDays = (companyId: string) => getStore().companies.find((c) => c.id === companyId)!.dataRetentionDays ?? 730;
const isOlderThanRetention = (a: AuditLog) =>
  a.companyId !== null && NOW.getTime() - Date.parse(a.createdAt) > retentionDays(a.companyId) * DAY;

describe("consent records seed", () => {
  it("keeps the history append-only and coherent: grant and withdrawal dates, company scope, existing users", () => {
    const s = getStore();
    expect(s.consentRecords.length).toBeGreaterThan(25);
    expect(new Set(s.consentRecords.map((r) => r.id)).size).toBe(s.consentRecords.length);
    for (const r of s.consentRecords) {
      expect(s.users.some((u) => u.id === r.userId)).toBe(true);
      expect(r.grantedAt !== null).toBe(r.status === "GRANTED");
      expect(r.withdrawnAt !== null).toBe(r.status === "WITHDRAWN");
      expect(r.createdAt).toBe(r.grantedAt ?? r.withdrawnAt);
      expect(Date.parse(r.createdAt)).toBeLessThan(NOW.getTime());
      if (r.companyId) expect(["MARKETING_EMAIL", "MARKETING_SMS"]).toContain(r.consentType);
      else if (r.consentType.startsWith("MARKETING")) expect(r.consentVersion).toBe("v1.0");
    }
  });

  it("covers the five consent types, both statuses and the three sources", () => {
    const s = getStore();
    expect(new Set(s.consentRecords.map((r) => r.consentType))).toEqual(
      new Set(["MARKETING_EMAIL", "MARKETING_SMS", "DATA_SHARING_PARTNERS", "COOKIES_ANALYTICS", "GEOLOCATION"]),
    );
    expect(new Set(s.consentRecords.map((r) => r.status))).toEqual(new Set(["GRANTED", "WITHDRAWN"]));
    expect(new Set(s.consentRecords.map((r) => r.source))).toEqual(new Set(["SIGNUP", "SETTINGS_PAGE", "BOOKING_FLOW"]));
  });

  it("only withdraws what had been granted earlier for the same user, type and company", () => {
    const s = getStore();
    for (const w of s.consentRecords.filter((r) => r.status === "WITHDRAWN")) {
      const earlier = s.consentRecords.filter((r) =>
        r.userId === w.userId && r.consentType === w.consentType && r.companyId === w.companyId
        && r.status === "GRANTED" && r.createdAt < w.createdAt);
      expect(earlier.length, w.id).toBeGreaterThan(0);
    }
  });

  it("has one legacy marketing row without a company, and marketing consents for several companies", () => {
    const s = getStore();
    expect(s.consentRecords.filter((r) => r.consentType === "MARKETING_EMAIL" && r.companyId === null)).toHaveLength(1);
    const companies = new Set(s.consentRecords.filter((r) => r.companyId).map((r) => r.companyId));
    expect(companies.size).toBeGreaterThan(1);
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().consentRecords)).not.toMatch(/@|\+221/);
  });
});

describe("audit log seed", () => {
  it("is large, unique and never in the future, with the producer's clock only where a source is given", () => {
    const list = getStore().auditLogs;
    expect(list.length).toBeGreaterThan(300);
    expect(new Set(list.map((a) => a.id)).size).toBe(list.length);
    for (const a of list) {
      expect(Date.parse(a.createdAt)).toBeLessThanOrEqual(NOW.getTime());
      expect(a.entityId.length).toBeGreaterThan(0);
      expect(a.sourceService).not.toBeNull();
      expect(a.occurredAt).toBe(a.createdAt);
    }
  });

  it("references existing companies and actors and keeps actor types coherent", () => {
    const s = getStore();
    for (const a of s.auditLogs) {
      if (a.companyId) expect(s.companies.some((c) => c.id === a.companyId)).toBe(true);
      if (a.actorUserId) expect(s.users.some((u) => u.id === a.actorUserId)).toBe(true);
      if (a.actorType === "USER") expect(a.actorUserId).not.toBeNull();
      if (a.actorType === "SYSTEM") expect(a.actorUserId).toBeNull();
      expect(a.actorLabel).toBeNull();
    }
  });

  it("covers creation, update, login, failed login, permission change and the retention purge", () => {
    const s = getStore();
    expect(new Set(s.auditLogs.map((a) => a.action))).toEqual(
      new Set(["CREATE", "UPDATE", "LOGIN", "LOGIN_FAILED", "PERMISSION_CHANGE"]),
    );
    expect(new Set(s.auditLogs.map((a) => a.sourceService))).toEqual(new Set([
      "company-service", "identity-service", "booking-service", "parcel-service", "audit-compliance-service",
    ]));
    const logins = s.auditLogs.filter((a) => a.action === "LOGIN");
    expect(logins).toHaveLength(s.sessions.length);
    const failed = s.auditLogs.filter((a) => a.action === "LOGIN_FAILED");
    expect(failed).toHaveLength(s.users.filter((u) => u.status === "suspended").length);
    for (const a of failed) expect(a.afterState).toEqual({ reason: "ACCOUNT_NOT_ACTIVE" });
  });

  it("derives one booking line per booking and one parcel line per status change", () => {
    const s = getStore();
    expect(s.auditLogs.filter((a) => a.entityType === "Booking")).toHaveLength(s.bookings.length);
    expect(s.auditLogs.filter((a) => a.entityType === "Parcel")).toHaveLength(
      s.parcelHistory.filter((h) => h.previousStatus !== null).length,
    );
    const first = s.auditLogs.find((a) => a.entityType === "Parcel")!;
    expect(first.beforeState!.status).toBeDefined();
    expect(first.afterState!.status).toBeDefined();
  });

  it("gives each active company three subscription history lines after its creation", () => {
    const s = getStore();
    for (const c of s.companies.filter((x) => x.status === "active")) {
      const lines = s.auditLogs.filter((a) => a.companyId === c.id && a.entityType === "CompanySubscription");
      expect(lines, c.name).toHaveLength(3);
      for (const l of lines) expect(l.createdAt > c.createdAt).toBe(true);
    }
  });

  it("anonymises every line older than its company's retention and leaves the others with their origin", () => {
    const s = getStore();
    const old = s.auditLogs.filter(isOlderThanRetention);
    expect(old.length).toBeGreaterThan(0);
    for (const a of old) {
      expect(a.ipAddress).toBeNull();
      expect(a.userAgent).toBeNull();
    }
    for (const a of s.auditLogs.filter((x) => !isOlderThanRetention(x) && x.actorType === "USER")) {
      expect(a.ipAddress, a.id).not.toBeNull();
      expect(a.userAgent, a.id).not.toBeNull();
    }
  });

  it("records the daily purge with the number of lines it really changed", () => {
    const purge = getStore().auditLogs.filter((a) => a.entityType === "RetentionPurge");
    expect(purge).toHaveLength(1);
    expect(purge[0]).toMatchObject({
      action: "UPDATE", actorType: "SYSTEM", actorUserId: null, companyId: null, sourceService: "audit-compliance-service",
      ipAddress: null,
    });
    expect(purge[0]!.createdAt).toBe("2026-11-02T03:15:00.000Z");
    expect(Number(purge[0]!.afterState!.anonymisedAuditLogs)).toBeGreaterThan(0);
  });

  it("stores states as strings only and holds no e-mail address or phone number", () => {
    const text = JSON.stringify(getStore().auditLogs);
    expect(text).not.toMatch(/@|\+221/);
    for (const a of getStore().auditLogs) {
      for (const state of [a.beforeState, a.afterState]) {
        if (state) for (const v of Object.values(state)) expect(typeof v).toBe("string");
      }
    }
  });

  it("leaves the stored audit lines sorted oldest first", () => {
    const list = getStore().auditLogs;
    for (let i = 1; i < list.length; i++) expect(list[i - 1]!.createdAt <= list[i]!.createdAt).toBe(true);
  });
});

describe("data access log seed", () => {
  it("records a view for every request, a modification for each closed one and an export for the portability", () => {
    const s = getStore();
    const forSubject = (userId: string) => s.dataAccessLogs.filter((l) => l.dataSubjectId === userId && l.dataCategory === "IDENTITY");
    for (const r of s.dataSubjectRequests) {
      const rows = forSubject(r.requesterUserId);
      expect(rows.some((l) => l.accessType === "VIEW"), r.id).toBe(true);
      if (r.resolvedAt) expect(rows.some((l) => l.accessType === "MODIFY" && l.createdAt === r.resolvedAt), r.id).toBe(true);
    }
    const portability = s.dataSubjectRequests.find((r) => r.requestType === "PORTABILITY" && r.status === "COMPLETED")!;
    expect(s.dataAccessLogs.some((l) => l.accessType === "EXPORT" && l.dataSubjectId === portability.requesterUserId)).toBe(true);
  });

  it("records three consent consultations with three different reasons", () => {
    const rows = getStore().dataAccessLogs.filter((l) => l.dataCategory === "CONSENT");
    expect(rows).toHaveLength(3);
    expect(rows.every((l) => l.accessType === "VIEW")).toBe(true);
    expect(new Set(rows.map((l) => l.accessReason)).size).toBe(3);
  });

  it("references existing accounts, types the data subject from its account and never dates a line in the future", () => {
    const s = getStore();
    expect(s.dataAccessLogs.length).toBeGreaterThan(15);
    expect(new Set(s.dataAccessLogs.map((l) => l.id)).size).toBe(s.dataAccessLogs.length);
    for (const l of s.dataAccessLogs) {
      const subject = s.users.find((u) => u.id === l.dataSubjectId)!;
      expect(subject).toBeDefined();
      expect(l.dataSubjectType).toBe(subject.companyId !== null ? "EMPLOYEE" : subject.roleCode === "USER" ? "CUSTOMER" : "USER");
      expect(s.users.find((u) => u.id === l.accessedByUserId)!.roleCode).toBe("ADMIN");
      expect(l.accessedByLabel).toBeNull();
      expect(l.ipAddress).not.toBeNull();
      expect(Date.parse(l.createdAt)).toBeLessThan(NOW.getTime());
    }
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().dataAccessLogs)).not.toMatch(/@|\+221/);
  });
});
