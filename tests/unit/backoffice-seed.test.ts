import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const HOUR = 3_600_000;
beforeEach(() => resetStore(NOW));

const admin = (identifier: string) => {
  const found = getStore().backofficeAdmins.filter((a) => a.identifier === identifier);
  expect(found, identifier).toHaveLength(1);
  return found[0]!;
};
const sessionsOf = (identifier: string) => getStore().backofficeSessions.filter((s) => s.adminId === admin(identifier).id);
const isActive = (s: { revokedAt: string | null; expiresAt: string }) => s.revokedAt === null && Date.parse(s.expiresAt) > NOW.getTime();

describe("backoffice team seed", () => {
  it("has six administrators with unique identifiers of the form prenom.nom@sira.app", () => {
    const list = getStore().backofficeAdmins;
    expect(list.map((a) => a.identifier).sort()).toEqual([
      "admin@sira.app", "awa.fall@sira.app", "fatou.diallo@sira.app", "ibrahima.sow@sira.app",
      "moustapha.ndiaye@sira.app", "seynabou.kane@sira.app",
    ]);
    expect(new Set(list.map((a) => a.id)).size).toBe(6);
    for (const a of list) expect(a.identifier).toMatch(/^[a-z0-9._-]{3,40}@sira\.app$/);
  });

  it("matches the scenarios: statuses, TOTP and recovery codes", () => {
    expect(admin("admin@sira.app")).toMatchObject({ displayName: "Administrateur Sira", status: "active", totpEnabled: true, recoveryCodesRemaining: 8 });
    expect(admin("moustapha.ndiaye@sira.app")).toMatchObject({ status: "active", totpEnabled: true, recoveryCodesRemaining: 6 });
    expect(admin("ibrahima.sow@sira.app")).toMatchObject({ status: "active", totpEnabled: true, recoveryCodesRemaining: 8 });
    expect(admin("fatou.diallo@sira.app")).toMatchObject({ status: "active", totpEnabled: true, recoveryCodesRemaining: 5 });
    expect(admin("seynabou.kane@sira.app")).toMatchObject({ status: "suspended", totpEnabled: true, recoveryCodesRemaining: 3 });
    expect(admin("awa.fall@sira.app")).toMatchObject({ status: "invited", totpEnabled: false, totpEnrolledAt: null, recoveryCodesRemaining: 0, lastLoginAt: null });
  });

  it("keeps the TOTP invariants: an enrolment date iff enabled, no code without TOTP", () => {
    for (const a of getStore().backofficeAdmins) {
      expect(a.totpEnrolledAt !== null, a.identifier).toBe(a.totpEnabled);
      if (!a.totpEnabled) expect(a.recoveryCodesRemaining).toBe(0);
      expect(a.createdAt < NOW.toISOString()).toBe(true);
    }
  });

  it("counts the active sessions per administrator", () => {
    const active = (id: string) => sessionsOf(id).filter(isActive).length;
    expect(active("admin@sira.app")).toBe(3);
    expect(active("moustapha.ndiaye@sira.app")).toBe(1);
    expect(active("ibrahima.sow@sira.app")).toBe(1);
    expect(active("fatou.diallo@sira.app")).toBe(2);
    expect(active("seynabou.kane@sira.app")).toBe(0);
    expect(sessionsOf("awa.fall@sira.app")).toHaveLength(0);
  });

  it("gives the signed-in administrator one current session, an Android one, a Firefox one and an expired one", () => {
    const own = sessionsOf("admin@sira.app");
    expect(own).toHaveLength(4);
    expect(own.filter((s) => s.current)).toHaveLength(1);
    expect(getStore().backofficeSessions.filter((s) => s.current)).toHaveLength(1);
    expect(isActive(own.find((s) => s.current)!)).toBe(true);
    expect(own.map((s) => s.deviceLabel)).toEqual(expect.arrayContaining(["Application Android", "Firefox · Ubuntu"]));
    expect(own.filter((s) => !s.current && !isActive(s))).toHaveLength(1);
  });

  it("keeps eight-hour sessions and a coherent revocation", () => {
    for (const s of getStore().backofficeSessions) {
      expect(Date.parse(s.expiresAt) - Date.parse(s.createdAt)).toBe(8 * HOUR);
      expect(Date.parse(s.lastSeenAt)).toBeGreaterThanOrEqual(Date.parse(s.createdAt));
      expect(Date.parse(s.lastSeenAt)).toBeLessThan(NOW.getTime());
      expect(s.revokedAt !== null).toBe(s.revokedReason !== null);
      expect(getStore().backofficeAdmins.some((a) => a.id === s.adminId)).toBe(true);
    }
    const kane = sessionsOf("seynabou.kane@sira.app");
    expect(kane).toHaveLength(1);
    expect(kane[0]!.revokedReason).toBe("Compte suspendu");
  });

  it("sets the last login to the start of the newest session", () => {
    for (const a of getStore().backofficeAdmins) {
      const starts = sessionsOf(a.identifier).map((s) => s.createdAt).sort();
      expect(a.lastLoginAt, a.identifier).toBe(starts.at(-1) ?? null);
    }
  });

  it("uses full addresses on the two known prefixes, never ending in 0", () => {
    for (const s of getStore().backofficeSessions) expect(s.ipAddress).toMatch(/^(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}$/);
  });
});

describe("backoffice journal seed", () => {
  const entriesOf = (identifier: string) => getStore().activity.filter((e) => e.actor === identifier);

  it("adds ten dated entries for the other active administrators, none for the signed-in one beyond the earlier lots", () => {
    const others = ["moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app"];
    expect(others.reduce((n, id) => n + entriesOf(id).length, 0)).toBe(10);
    for (const e of others.flatMap(entriesOf)) {
      expect(Date.parse(e.at)).toBeLessThan(NOW.getTime());
      expect(Date.parse(e.at)).toBeGreaterThan(NOW.getTime() - 41 * 86_400_000);
    }
    expect(entriesOf("seynabou.kane@sira.app")).toHaveLength(0);
    expect(entriesOf("awa.fall@sira.app")).toHaveLength(0);
  });

  it("gives ibrahima.sow one old and one recent entry, and moustapha.ndiaye two data reveals", () => {
    const ibrahima = entriesOf("ibrahima.sow@sira.app").sort((a, b) => a.at.localeCompare(b.at));
    expect(ibrahima.map((e) => e.action)).toEqual([
      "Type de document KYC désactivé", "Paliers partenaires consultés pour audit", "Incident déclaré (Haute) sur booking-service",
    ]);
    expect(NOW.getTime() - Date.parse(ibrahima[0]!.at)).toBeGreaterThan(39 * 86_400_000);
    expect(NOW.getTime() - Date.parse(ibrahima[2]!.at)).toBeLessThan(4 * 86_400_000);
    expect(entriesOf("moustapha.ndiaye@sira.app").filter((e) => e.action.startsWith("Donnée personnelle révélée"))).toHaveLength(2);
  });

  it("holds no e-mail address, no phone number and no IP address", () => {
    const text = JSON.stringify(getStore().activity.filter((e) => e.actor !== "admin@sira.app"));
    expect(text.replace(/[a-z.]+@sira\.app/g, "")).not.toMatch(/@|\+221|\d+\.\d+\.\d+\.\d+/);
  });
});
