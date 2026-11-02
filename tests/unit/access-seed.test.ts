import { beforeEach, describe, expect, it } from "vitest";
import { sessionState } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const grants = (role: string) =>
  getStore().rolePermissions.filter((rp) => rp.roleCode === role).map((rp) => rp.permissionCode).sort();

describe("access seed: roles and permissions", () => {
  it("has the five platform roles", () => {
    expect(getStore().roles.map((r) => r.code)).toEqual(["ADMIN", "MANAGER", "GUICHETIER", "CHAUFFEUR", "USER"]);
  });

  it("has the 19 real permission codes, each in one of the 11 domains, without duplicates", () => {
    const perms = getStore().permissions;
    expect(perms).toHaveLength(19);
    expect(new Set(perms.map((p) => p.code)).size).toBe(19);
    expect(new Set(perms.map((p) => p.domain)).size).toBe(11);
    for (const code of ["RBAC_MANAGE", "USER_MANAGE", "COMPANY_KYC_REVIEW", "EMPLOYEE_CONFIDENTIAL_ACCESS",
      "COMPLIANCE_READ", "COMPLIANCE_MANAGE", "MONITORING_READ", "MONITORING_MANAGE", "FLEET_MAINTENANCE_MANAGE"]) {
      expect(perms.map((p) => p.code)).toContain(code);
    }
  });

  it("only grants existing permissions to existing roles", () => {
    const s = getStore();
    for (const rp of s.rolePermissions) {
      expect(s.roles.map((r) => r.code)).toContain(rp.roleCode);
      expect(s.permissions.map((p) => p.code)).toContain(rp.permissionCode);
    }
  });

  it("grants the platform migrations' sets: ADMIN 17, MANAGER 12, GUICHETIER 3, CHAUFFEUR and USER none", () => {
    expect(grants("ADMIN")).toHaveLength(17);
    expect(grants("ADMIN")).not.toContain("EMPLOYEE_CONFIDENTIAL_ACCESS");
    expect(grants("ADMIN")).not.toContain("COMPANY_PARTNERSHIP_MANAGE");
    expect(grants("MANAGER")).toEqual([
      "BOOKING_MANAGE", "COMPANY_KYC_SUBMIT", "COMPANY_MANAGE", "COMPANY_PARTNERSHIP_MANAGE", "CUSTOMER_MANAGE",
      "EMPLOYEE_MANAGE", "FLEET_MAINTENANCE_MANAGE", "FLEET_MANAGE", "MARKETING_MANAGE", "NOTIFICATION_MANAGE",
      "PARCEL_MANAGE", "USER_MANAGE",
    ]);
    expect(grants("GUICHETIER")).toEqual(["BOOKING_MANAGE", "FLEET_MANAGE", "USER_MANAGE"]);
    expect(grants("CHAUFFEUR")).toEqual([]);
    expect(grants("USER")).toEqual([]);
  });

  it("never grants a platform permission to a company role", () => {
    for (const role of ["MANAGER", "GUICHETIER"]) {
      for (const code of grants(role)) {
        expect(code).not.toMatch(/^(RBAC_MANAGE|COMPANY_KYC_REVIEW|COMPLIANCE_|MONITORING_|EMPLOYEE_CONFIDENTIAL_ACCESS)/);
      }
    }
  });
});

describe("access seed: accounts", () => {
  it("has one account per employee of a non-draft company, two platform admins and four clients", () => {
    const s = getStore();
    const linked = s.employees.filter((e) => e.userId !== null);
    const draftIds = s.companies.filter((c) => c.status === "draft").map((c) => c.id);
    expect(linked).toHaveLength(45);
    expect(s.employees.filter((e) => e.userId === null).every((e) => draftIds.includes(e.companyId))).toBe(true);
    expect(s.users).toHaveLength(51);
    expect(s.users.filter((u) => u.roleCode === "ADMIN").map((u) => u.username)).toEqual(["moustapha.ndiaye", "seynabou.kane"]);
    expect(s.users.filter((u) => u.roleCode === "USER")).toHaveLength(4);
  });

  it("mirrors each linked employee in its account (same company, role, name, e-mail and phone)", () => {
    const s = getStore();
    for (const e of s.employees.filter((x) => x.userId !== null)) {
      const u = s.users.find((x) => x.id === e.userId)!;
      expect([u.companyId, u.roleCode, u.displayName, u.email, u.phone]).toEqual([e.companyId, e.role, e.name, e.email, e.phone]);
    }
  });

  it("has unique identifiers and usernames, every role existing, and exactly two suspended accounts", () => {
    const s = getStore();
    expect(new Set(s.users.map((u) => u.id)).size).toBe(51);
    expect(new Set(s.users.map((u) => u.username)).size).toBe(51);
    for (const u of s.users) expect(s.roles.map((r) => r.code)).toContain(u.roleCode);
    expect(s.users.filter((u) => u.status === "suspended").map((u) => u.username)).toEqual(["seynabou.kane", "pape.mbaye"]);
  });

  it("has exactly one active administrator", () => {
    const admins = getStore().users.filter((u) => u.roleCode === "ADMIN" && u.status === "active");
    expect(admins.map((u) => u.username)).toEqual(["moustapha.ndiaye"]);
  });

  it("uses the employee contact formats for every account", () => {
    for (const u of getStore().users) {
      expect(u.email).toMatch(/^[a-z0-9._-]+@[a-z0-9-]+\.sn$/);
      expect(u.phone).toMatch(/^\+2217865\d{5}$/);
    }
  });
});

describe("access seed: sessions", () => {
  it("ties every session to an existing account and gives every active account 1 to 3 sessions", () => {
    const s = getStore();
    for (const x of s.sessions) expect(s.users.some((u) => u.id === x.userId)).toBe(true);
    for (const u of s.users.filter((x) => x.status === "active")) {
      const n = s.sessions.filter((x) => x.userId === u.id).length;
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThanOrEqual(3);
    }
  });

  it("orders session dates coherently", () => {
    for (const x of getStore().sessions) {
      expect(x.createdAt <= x.lastSeenAt).toBe(true);
      expect(x.lastSeenAt <= x.expiresAt).toBe(true);
      expect(x.lastSeenAt <= NOW.toISOString()).toBe(true);
      if (x.revokedAt !== null) {
        expect(x.revokedAt >= x.lastSeenAt).toBe(true);
        expect(x.revokedReason).not.toBeNull();
      } else {
        expect(x.revokedReason).toBeNull();
      }
    }
  });

  it("has active, revoked and expired sessions", () => {
    const states = getStore().sessions.map((x) => sessionState(x, NOW));
    expect(states.filter((st) => st === "active")).toHaveLength(73);
    expect(states.filter((st) => st === "revoked")).toHaveLength(10);
    expect(states.filter((st) => st === "expired")).toHaveLength(18);
  });

  it("leaves no active session to a suspended account", () => {
    const s = getStore();
    for (const u of s.users.filter((x) => x.status === "suspended")) {
      const own = s.sessions.filter((x) => x.userId === u.id);
      expect(own.length).toBeGreaterThan(0);
      expect(own.every((x) => sessionState(x, NOW) !== "active")).toBe(true);
    }
  });

  it("sets lastLoginAt to the start of the newest session, after the account creation", () => {
    const s = getStore();
    for (const u of s.users) {
      const newest = s.sessions.filter((x) => x.userId === u.id).map((x) => x.createdAt).sort().at(-1);
      expect(u.lastLoginAt).toBe(newest);
      expect(u.createdAt <= u.lastLoginAt!).toBe(true);
    }
  });

  it("stores full IPv4 addresses whose last byte is never 0", () => {
    for (const x of getStore().sessions) expect(x.ipAddress).toMatch(/^(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}$/);
  });

  it("puts no account e-mail or phone in the seeded activity log", () => {
    const s = getStore();
    const log = JSON.stringify(s.activity);
    for (const u of s.users) {
      expect(log).not.toContain(u.email);
      expect(log).not.toContain(u.phone);
    }
  });
});
