import { beforeEach, describe, expect, it } from "vitest";
import {
  adminsRepo, backofficeSessionState, JOURNAL_LIMIT, journalRepo, profileRepo,
} from "@/lib/repos/backoffice";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const SELF = "admin@sira.app";
const rowOf = (identifier: string, self = SELF) => adminsRepo.listRows({}, NOW, self).find((r) => r.identifier === identifier)!;

describe("session state", () => {
  it("is revoked first, then expired, then active", () => {
    const base = { revokedAt: null, revokedReason: null, expiresAt: new Date(NOW.getTime() + 1).toISOString() };
    expect(backofficeSessionState(base as never, NOW)).toBe("active");
    expect(backofficeSessionState({ ...base, expiresAt: NOW.toISOString() } as never, NOW)).toBe("expired");
    expect(backofficeSessionState({ ...base, revokedAt: NOW.toISOString(), revokedReason: "x" } as never, NOW)).toBe("revoked");
    expect(backofficeSessionState({ ...base, expiresAt: NOW.toISOString(), revokedAt: NOW.toISOString(), revokedReason: "x" } as never, NOW)).toBe("revoked");
  });
});

describe("administrators list", () => {
  it("lists the six administrators oldest first, with only client-safe fields", () => {
    const rows = adminsRepo.listRows({}, NOW, SELF);
    expect(rows.map((r) => r.identifier)).toEqual([
      "admin@sira.app", "moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app", "seynabou.kane@sira.app", "awa.fall@sira.app",
    ]);
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "activeSessions", "createdAt", "displayName", "id", "identifier", "isSelf", "lastLoginAt", "recoveryCodesRemaining", "status", "totpEnabled",
    ]);
  });

  it("flags only the signed-in administrator as self", () => {
    const rows = adminsRepo.listRows({}, NOW, SELF);
    expect(rows.filter((r) => r.isSelf).map((r) => r.identifier)).toEqual([SELF]);
    expect(adminsRepo.listRows({}, NOW, "someone@sira.app").some((r) => r.isSelf)).toBe(false);
  });

  it("counts active sessions: revoked and expired ones do not count", () => {
    expect(rowOf(SELF).activeSessions).toBe(3);
    expect(rowOf("fatou.diallo@sira.app").activeSessions).toBe(2);
    expect(rowOf("seynabou.kane@sira.app").activeSessions).toBe(0);
    expect(rowOf("awa.fall@sira.app").activeSessions).toBe(0);
  });

  it("filters by status", () => {
    expect(adminsRepo.listRows({ status: "active" }, NOW, SELF)).toHaveLength(4);
    expect(adminsRepo.listRows({ status: "suspended" }, NOW, SELF).map((r) => r.identifier)).toEqual(["seynabou.kane@sira.app"]);
    expect(adminsRepo.listRows({ status: "invited" }, NOW, SELF).map((r) => r.identifier)).toEqual(["awa.fall@sira.app"]);
  });

  it("finds one administrator by id", () => {
    const id = getStore().backofficeAdmins[1]!.id;
    expect(adminsRepo.get(id)?.identifier).toBe("moustapha.ndiaye@sira.app");
    expect(adminsRepo.get("inconnu")).toBeUndefined();
  });

  it("holds no full IP address", () => {
    expect(JSON.stringify(adminsRepo.listRows({}, NOW, SELF))).not.toMatch(/\d+\.\d+\.\d+\.\d+/);
  });
});

describe("profile view", () => {
  it("returns undefined for an actor outside the team", () => {
    expect(profileRepo.view("someone@sira.app", NOW)).toBeUndefined();
  });

  it("shows the account, the TOTP state and the sessions newest first with truncated addresses", () => {
    const v = profileRepo.view(SELF, NOW)!;
    expect(v).toMatchObject({
      displayName: "Administrateur Sira", identifier: SELF, roleLabel: "Administrateur", totpEnabled: true, recoveryCodesRemaining: 8,
    });
    expect(v.sessions).toHaveLength(4);
    for (let i = 1; i < v.sessions.length; i++) expect(v.sessions[i - 1]!.createdAt >= v.sessions[i]!.createdAt).toBe(true);
    expect(v.sessions.filter((s) => s.current)).toHaveLength(1);
    expect(v.sessions.find((s) => s.current)!.state).toBe("active");
    expect(v.sessions.filter((s) => s.state === "expired")).toHaveLength(1);
    for (const s of v.sessions) expect(s.ip).toMatch(/^\d+\.\d+\.\d+\.0$/);
    expect(Object.keys(v.sessions[0]!).sort()).toEqual(["createdAt", "current", "deviceLabel", "expiresAt", "id", "ip", "lastSeenAt", "revokedReason", "state"]);
    expect(JSON.stringify(v)).not.toMatch(/(41\.82|196\.207)\.\d{1,3}\.[1-9]\d{0,2}\b/);
  });

  it("counts the other active sessions (the current one excluded)", () => {
    expect(profileRepo.view(SELF, NOW)!.otherActiveSessions).toBe(2);
  });
});

describe("journal", () => {
  it("lists actors present in the journal, sorted", () => {
    const actors = journalRepo.actors();
    expect(actors).toEqual([...actors].sort());
    expect(actors).toEqual(expect.arrayContaining(["admin@sira.app", "moustapha.ndiaye@sira.app", "ibrahima.sow@sira.app", "fatou.diallo@sira.app"]));
    expect(new Set(actors).size).toBe(actors.length);
  });

  it("lists newest first and projects only safe fields", () => {
    const rows = journalRepo.list({}, NOW);
    expect(rows.length).toBeGreaterThan(10);
    for (let i = 1; i < rows.length; i++) expect(rows[i - 1]!.at >= rows[i]!.at).toBe(true);
    expect(Object.keys(rows[0]!).sort()).toEqual(["action", "actor", "at", "companyName", "id"]);
  });

  it("filters by actor, by period and by data reveals, combined", () => {
    const ibrahima = "ibrahima.sow@sira.app";
    expect(journalRepo.list({ actor: ibrahima }, NOW)).toHaveLength(3);
    expect(journalRepo.list({ actor: ibrahima, days: 30 }, NOW).map((r) => r.action)).toEqual([
      "Incident déclaré (Haute) sur booking-service", "Paliers partenaires consultés pour audit",
    ]);
    expect(journalRepo.list({ actor: ibrahima, days: 90 }, NOW)).toHaveLength(3);
    const reveals = journalRepo.list({ actor: "moustapha.ndiaye@sira.app", revealsOnly: true }, NOW);
    expect(reveals).toHaveLength(2);
    expect(reveals.every((r) => r.action.startsWith("Donnée personnelle révélée"))).toBe(true);
    expect(journalRepo.list({ actor: ibrahima, revealsOnly: true }, NOW)).toEqual([]);
    expect(journalRepo.list({ actor: "inconnu" }, NOW)).toEqual([]);
  });

  it("keeps the period bound inclusive and relative to the injected clock", () => {
    const s = getStore();
    s.activity.unshift({ id: "edge", companyId: null, at: new Date(NOW.getTime() - 7 * DAY).toISOString(), actor: "edge@sira.app", action: "Bord" });
    expect(journalRepo.list({ actor: "edge@sira.app", days: 7 }, NOW)).toHaveLength(1);
    expect(journalRepo.list({ actor: "edge@sira.app", days: 7 }, new Date(NOW.getTime() + 1))).toHaveLength(0);
  });

  it("names the company of an entry, nothing for a platform entry", () => {
    const s = getStore();
    const company = s.companies[0]!;
    s.activity.unshift({ id: "c1", companyId: company.id, at: NOW.toISOString(), actor: "edge@sira.app", action: "Avec compagnie" });
    s.activity.unshift({ id: "c2", companyId: null, at: NOW.toISOString(), actor: "edge@sira.app", action: "Sans compagnie" });
    const rows = journalRepo.list({ actor: "edge@sira.app" }, NOW);
    expect(rows.find((r) => r.id === "c1")!.companyName).toBe(company.name);
    expect(rows.find((r) => r.id === "c2")!.companyName).toBeNull();
  });

  it("keeps at most 500 entries, the most recent", () => {
    const s = getStore();
    for (let i = 0; i < 600; i++) {
      s.activity.push({ id: `bulk-${i}`, companyId: null, at: new Date(NOW.getTime() - i * 1000).toISOString(), actor: "bulk@sira.app", action: `Entrée ${i}` });
    }
    const rows = journalRepo.list({ actor: "bulk@sira.app" }, NOW);
    expect(JOURNAL_LIMIT).toBe(500);
    expect(rows).toHaveLength(500);
    expect(rows[0]!.action).toBe("Entrée 0");
    expect(rows.at(-1)!.action).toBe("Entrée 499");
    expect(journalRepo.list({}, NOW)).toHaveLength(500);
  });

  it("computes the indicators against the injected clock", () => {
    const s = getStore();
    const stats = journalRepo.stats(NOW);
    const week = s.activity.filter((e) => Date.parse(e.at) >= NOW.getTime() - 7 * DAY);
    expect(stats.entries7d).toBe(week.length);
    expect(stats.actors7d).toBe(new Set(week.map((e) => e.actor)).size);
    expect(stats.reveals30d).toBe(s.activity.filter((e) => /révélé/i.test(e.action) && Date.parse(e.at) >= NOW.getTime() - 30 * DAY).length);
    expect(stats.reveals30d).toBeGreaterThanOrEqual(2);
    expect(journalRepo.stats(new Date(NOW.getTime() + 60 * DAY))).toEqual({ entries7d: 0, actors7d: 0, reveals30d: 0 });
  });
});
