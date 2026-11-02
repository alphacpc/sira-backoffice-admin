import { beforeEach, describe, expect, it } from "vitest";
import { permissionsRepo, rolesRepo, sessionsRepo, usersRepo } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const userBy = (username: string) => getStore().users.find((u) => u.username === username)!;

describe("usersRepo.listRows", () => {
  it("returns a projection without contact data, field by field", () => {
    const row = usersRepo.listRows({}, NOW)[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "activeSessions", "companyId", "companyName", "displayName", "id", "lastLoginAt", "roleCode",
      "roleName", "status", "username",
    ]);
  });

  it("filters by role and by status, and combines both", () => {
    expect(usersRepo.listRows({ roleCode: "ADMIN" }, NOW).map((r) => r.username).sort())
      .toEqual(["moustapha.ndiaye", "seynabou.kane"]);
    expect(usersRepo.listRows({ status: "suspended" }, NOW).map((r) => r.username).sort())
      .toEqual(["pape.mbaye", "seynabou.kane"]);
    expect(usersRepo.listRows({ roleCode: "USER", status: "active" }, NOW)).toHaveLength(3);
    expect(usersRepo.listRows({}, NOW)).toHaveLength(51);
  });

  it("sorts by display name, then username", () => {
    const rows = usersRepo.listRows({}, NOW);
    const keys = rows.map((r) => [r.displayName, r.username] as const);
    const sorted = [...keys].sort((a, b) => a[0].localeCompare(b[0], "fr") || a[1].localeCompare(b[1]));
    expect(keys).toEqual(sorted);
    expect(rows[0]!.displayName).toBe("Aïssatou Sarr");
  });

  it("names the role and the linked company, null for platform accounts", () => {
    const rows = usersRepo.listRows({}, NOW);
    expect(rows.find((r) => r.username === "khady-faye.matam-express")).toMatchObject({
      roleName: "Responsable de compagnie", companyName: "Matam Express",
    });
    expect(rows.find((r) => r.username === "moustapha.ndiaye")).toMatchObject({
      roleName: "Administrateur", companyId: null, companyName: null,
    });
  });

  it("counts active sessions against the injected date, never an expired one", () => {
    const id = userBy("lamine.camara").id;
    expect(usersRepo.listRows({}, NOW).find((r) => r.id === id)!.activeSessions).toBe(3);
    const later = new Date(NOW.getTime() + 5 * DAY);
    expect(usersRepo.listRows({}, later).find((r) => r.id === id)!.activeSessions).toBe(1);
    const muchLater = new Date(NOW.getTime() + 30 * DAY);
    expect(usersRepo.listRows({}, muchLater).every((r) => r.activeSessions === 0)).toBe(true);
  });

  it("counts no revoked session as active", () => {
    const row = usersRepo.listRows({}, NOW).find((r) => r.username === "mariama-ba.dakar-voyages")!;
    expect(getStore().sessions.filter((x) => x.userId === row.id)).toHaveLength(3);
    expect(row.activeSessions).toBe(1);
  });
});

describe("usersRepo.detail", () => {
  it("returns the account, its role, company, inherited permissions and sessions newest first", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const d = usersRepo.detail(u.id, NOW)!;
    expect(d.user.id).toBe(u.id);
    expect(d.role?.code).toBe("GUICHETIER");
    expect(d.companyName).toBe("Dakar Voyages");
    expect(d.permissions.map((p) => p.code)).toEqual(["FLEET_MANAGE", "BOOKING_MANAGE", "USER_MANAGE"]);
    expect(d.sessions).toHaveLength(2);
    expect(d.sessions[0]!.createdAt > d.sessions[1]!.createdAt).toBe(true);
    expect(d.activeSessions).toBe(2);
    expect(d.activity).toEqual([]);
  });

  it("projects the sessions without the full IP address", () => {
    const d = usersRepo.detail(userBy("lamine.camara").id, NOW)!;
    expect(Object.keys(d.sessions[0]!).sort()).toEqual([
      "createdAt", "deviceLabel", "displayName", "expiresAt", "id", "ip", "lastSeenAt", "revokedAt",
      "revokedReason", "state", "userId", "username",
    ]);
    for (const x of d.sessions) expect(x.ip).toMatch(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.0$/);
  });

  it("returns undefined for an unknown id", () => {
    expect(usersRepo.detail("nope", NOW)).toBeUndefined();
  });
});

describe("rolesRepo", () => {
  it("counts users and lists permissions of each role", () => {
    const rows = rolesRepo.listRows();
    const byCode = Object.fromEntries(rows.map((r) => [r.code, r]));
    expect(rows.map((r) => r.code)).toEqual(["ADMIN", "MANAGER", "GUICHETIER", "CHAUFFEUR", "USER"]);
    expect([byCode.ADMIN!.userCount, byCode.MANAGER!.userCount, byCode.GUICHETIER!.userCount,
      byCode.CHAUFFEUR!.userCount, byCode.USER!.userCount]).toEqual([2, 15, 15, 15, 4]);
    expect([byCode.ADMIN!.permissions.length, byCode.MANAGER!.permissions.length,
      byCode.GUICHETIER!.permissions.length, byCode.CHAUFFEUR!.permissions.length]).toEqual([17, 12, 3, 0]);
    expect(rows.reduce((n, r) => n + r.userCount, 0)).toBe(getStore().users.length);
  });

  it("offers every role as an option", () => {
    expect(rolesRepo.options()).toEqual([
      { code: "ADMIN", name: "Administrateur" }, { code: "MANAGER", name: "Responsable de compagnie" },
      { code: "GUICHETIER", name: "Agent de vente" }, { code: "CHAUFFEUR", name: "Chauffeur" },
      { code: "USER", name: "Utilisateur" },
    ]);
  });
});

describe("permissionsRepo.matrix", () => {
  it("groups the permissions by domain in the display order", () => {
    const m = permissionsRepo.matrix();
    expect(m.groups.map((g) => g.domain)).toEqual([
      "companies", "fleet", "bookings", "parcels", "hr", "customers",
      "marketing", "notifications", "compliance", "monitoring", "platform",
    ]);
    expect(m.groups.flatMap((g) => g.rows)).toHaveLength(19);
  });

  it("reflects exactly the grants of each role", () => {
    const s = getStore();
    const m = permissionsRepo.matrix();
    for (const row of m.groups.flatMap((g) => g.rows)) {
      const expected = s.rolePermissions.filter((rp) => rp.permissionCode === row.code).map((rp) => rp.roleCode).sort();
      expect([...row.grantedTo].sort()).toEqual(expected);
    }
    const rows = m.groups.flatMap((g) => g.rows);
    expect(rows.filter((r) => r.grantedTo.includes("MANAGER"))).toHaveLength(12);
    expect(rows.find((r) => r.code === "EMPLOYEE_CONFIDENTIAL_ACCESS")!.grantedTo).toEqual([]);
    expect(rows.find((r) => r.code === "RBAC_MANAGE")!.grantedTo).toEqual(["ADMIN"]);
  });
});

describe("sessionsRepo.activeRows", () => {
  it("lists only active sessions, most recently seen first", () => {
    const rows = sessionsRepo.activeRows({}, NOW);
    expect(rows).toHaveLength(73);
    expect(rows.every((r) => r.state === "active")).toBe(true);
    const seen = rows.map((r) => r.lastSeenAt);
    expect([...seen].sort().reverse()).toEqual(seen);
  });

  it("filters by the role of the account", () => {
    const rows = sessionsRepo.activeRows({ roleCode: "USER" }, NOW);
    expect(rows.length).toBeGreaterThan(0);
    const users = getStore().users;
    expect(rows.every((r) => users.find((u) => u.id === r.userId)!.roleCode === "USER")).toBe(true);
    expect(rows.filter((r) => r.username === "lamine.camara")).toHaveLength(3);
  });

  it("truncates every IP address to a.b.c.0", () => {
    const s = getStore();
    for (const r of sessionsRepo.activeRows({}, NOW)) {
      const full = s.sessions.find((x) => x.id === r.id)!.ipAddress;
      expect(r.ip).toBe(full.replace(/\.\d+$/, ".0"));
      expect(r.ip).not.toBe(full);
    }
  });

  it("drops a session once it expires", () => {
    expect(sessionsRepo.activeRows({}, new Date(NOW.getTime() + 30 * DAY))).toEqual([]);
  });
});
