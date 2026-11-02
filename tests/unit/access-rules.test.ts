import { beforeEach, describe, expect, it } from "vitest";
import { ROLE_CHANGE_REASON, sessionState, sessionsRepo, usersRepo } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
const ACTOR = "tester@sira.app";
beforeEach(() => resetStore(NOW));

const userBy = (username: string) => getStore().users.find((u) => u.username === username)!;
const sessionsOf = (userId: string) => getStore().sessions.filter((x) => x.userId === userId);
const activeOf = (userId: string) => sessionsOf(userId).filter((x) => sessionState(x, NOW) === "active");
const snapshot = (userId: string) => JSON.stringify(sessionsOf(userId));

describe("usersRepo.changeRole", () => {
  it("changes the role and revokes every active session with the role-change reason", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(activeOf(u.id)).toHaveLength(2);
    const r = usersRepo.changeRole(u.id, "MANAGER", "  Promotion  ", ACTOR, NOW);
    expect(r.revoked).toBe(2);
    expect(u.roleCode).toBe("MANAGER");
    expect(activeOf(u.id)).toHaveLength(0);
    for (const x of sessionsOf(u.id)) {
      expect(x.revokedAt).toBe(NOW.toISOString());
      expect(x.revokedReason).toBe(ROLE_CHANGE_REASON);
    }
  });

  it("leaves already revoked and expired sessions untouched", () => {
    const u = userBy("mariama-ba.dakar-voyages");
    const [, revoked, expired] = [...sessionsOf(u.id)];
    const before = [JSON.stringify(revoked), JSON.stringify(expired)];
    expect(usersRepo.changeRole(u.id, "GUICHETIER", "Réorganisation", ACTOR, NOW).revoked).toBe(1);
    expect([JSON.stringify(revoked), JSON.stringify(expired)]).toEqual(before);
  });

  it("writes one platform activity entry tied to the account, with the reason and no contact data", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const n = getStore().activity.length;
    usersRepo.changeRole(u.id, "MANAGER", "Promotion", ACTOR, NOW);
    expect(getStore().activity.length).toBe(n + 1);
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({
      companyId: null, userId: u.id, actor: ACTOR, at: NOW.toISOString(),
      action: "Rôle de ibrahima-sow.dakar-voyages changé : Agent de vente → Responsable de compagnie (2 session(s) révoquée(s)). Motif : Promotion",
    });
    expect(entry.action).not.toContain(u.email);
    expect(entry.action).not.toContain(u.phone);
  });

  it("refuses an unknown account or an unknown role and changes nothing", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const before = snapshot(u.id);
    expect(() => usersRepo.changeRole("nope", "MANAGER", "x", ACTOR, NOW)).toThrow("Utilisateur introuvable");
    expect(() => usersRepo.changeRole(u.id, "SUPERADMIN", "x", ACTOR, NOW)).toThrow("Rôle inconnu");
    expect(u.roleCode).toBe("GUICHETIER");
    expect(snapshot(u.id)).toBe(before);
  });

  it("refuses a blank reason", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(() => usersRepo.changeRole(u.id, "MANAGER", "   ", ACTOR, NOW)).toThrow("Un motif est obligatoire");
    expect(u.roleCode).toBe("GUICHETIER");
  });

  it("refuses the role the account already has and revokes nothing", () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const before = snapshot(u.id);
    const n = getStore().activity.length;
    expect(() => usersRepo.changeRole(u.id, "GUICHETIER", "x", ACTOR, NOW)).toThrow("Le compte a déjà ce rôle");
    expect(snapshot(u.id)).toBe(before);
    expect(getStore().activity.length).toBe(n);
  });

  it("refuses to change one's own role, whether the actor is the e-mail or the username", () => {
    const u = userBy("lamine.camara");
    const before = snapshot(u.id);
    expect(() => usersRepo.changeRole(u.id, "MANAGER", "x", u.email, NOW)).toThrow("Impossible de changer son propre rôle");
    expect(() => usersRepo.changeRole(u.id, "MANAGER", "x", u.username, NOW)).toThrow("Impossible de changer son propre rôle");
    expect(u.roleCode).toBe("USER");
    expect(snapshot(u.id)).toBe(before);
  });

  it("refuses to demote the last active administrator and revokes nothing", () => {
    const admin = userBy("moustapha.ndiaye");
    const before = snapshot(admin.id);
    expect(() => usersRepo.changeRole(admin.id, "MANAGER", "x", ACTOR, NOW))
      .toThrow("Impossible de rétrograder le dernier administrateur actif");
    expect(admin.roleCode).toBe("ADMIN");
    expect(snapshot(admin.id)).toBe(before);
  });

  it("allows demoting an administrator once another one is active, and a suspended administrator anytime", () => {
    usersRepo.changeRole(userBy("seynabou.kane").id, "USER", "Départ", ACTOR, NOW);
    expect(userBy("seynabou.kane").roleCode).toBe("USER");
    usersRepo.changeRole(userBy("lamine.camara").id, "ADMIN", "Renfort", ACTOR, NOW);
    usersRepo.changeRole(userBy("moustapha.ndiaye").id, "MANAGER", "Rotation", ACTOR, NOW);
    expect(userBy("moustapha.ndiaye").roleCode).toBe("MANAGER");
  });
});

describe("usersRepo.revokeAllSessions", () => {
  it("revokes every active session with the given reason and logs it", () => {
    const u = userBy("lamine.camara");
    expect(usersRepo.revokeAllSessions(u.id, "  Appareil perdu  ", ACTOR, NOW)).toBe(3);
    expect(activeOf(u.id)).toHaveLength(0);
    expect(sessionsOf(u.id).every((x) => x.revokedReason === "Appareil perdu" && x.revokedAt === NOW.toISOString())).toBe(true);
    expect(getStore().activity[0]).toMatchObject({
      companyId: null, userId: u.id, actor: ACTOR,
      action: "3 session(s) de lamine.camara révoquée(s). Motif : Appareil perdu",
    });
  });

  it("refuses when nothing is active and writes nothing", () => {
    const suspended = userBy("pape.mbaye");
    const n = getStore().activity.length;
    const before = snapshot(suspended.id);
    expect(() => usersRepo.revokeAllSessions(suspended.id, "x", ACTOR, NOW)).toThrow("Aucune session active à révoquer");
    expect(snapshot(suspended.id)).toBe(before);
    expect(getStore().activity.length).toBe(n);
  });

  it("refuses a second revocation and an unknown account or a blank reason", () => {
    const u = userBy("lamine.camara");
    usersRepo.revokeAllSessions(u.id, "x", ACTOR, NOW);
    expect(() => usersRepo.revokeAllSessions(u.id, "x", ACTOR, NOW)).toThrow("Aucune session active à révoquer");
    expect(() => usersRepo.revokeAllSessions("nope", "x", ACTOR, NOW)).toThrow("Utilisateur introuvable");
    expect(() => usersRepo.revokeAllSessions(userBy("ndeye.diouf").id, " ", ACTOR, NOW)).toThrow("Un motif est obligatoire");
  });
});

describe("sessionsRepo.revoke", () => {
  it("revokes one active session only, with the reason, and logs it on the account", () => {
    const u = userBy("lamine.camara");
    const target = activeOf(u.id)[1]!;
    sessionsRepo.revoke(target.id, "Session suspecte", ACTOR, NOW);
    expect(target.revokedAt).toBe(NOW.toISOString());
    expect(target.revokedReason).toBe("Session suspecte");
    expect(activeOf(u.id)).toHaveLength(2);
    expect(getStore().activity[0]).toMatchObject({
      companyId: null, userId: u.id,
      action: `Session de lamine.camara révoquée (${target.deviceLabel}). Motif : Session suspecte`,
    });
  });

  it("refuses an already revoked or an expired session and changes nothing", () => {
    const s = getStore();
    const revoked = s.sessions.find((x) => sessionState(x, NOW) === "revoked")!;
    const expired = s.sessions.find((x) => sessionState(x, NOW) === "expired")!;
    const before = [JSON.stringify(revoked), JSON.stringify(expired)];
    expect(() => sessionsRepo.revoke(revoked.id, "x", ACTOR, NOW)).toThrow("La session est déjà révoquée ou expirée");
    expect(() => sessionsRepo.revoke(expired.id, "x", ACTOR, NOW)).toThrow("La session est déjà révoquée ou expirée");
    expect([JSON.stringify(revoked), JSON.stringify(expired)]).toEqual(before);
  });

  it("refuses an unknown session or a blank reason", () => {
    const target = activeOf(userBy("lamine.camara").id)[0]!;
    expect(() => sessionsRepo.revoke("nope", "x", ACTOR, NOW)).toThrow("Session introuvable");
    expect(() => sessionsRepo.revoke(target.id, "  ", ACTOR, NOW)).toThrow("Un motif est obligatoire");
    expect(target.revokedAt).toBeNull();
  });
});

describe("usersRepo.logReveal", () => {
  it("logs the field on the account, never the value", () => {
    const u = userBy("khady-faye.matam-express");
    usersRepo.logReveal(u.id, "phone", ACTOR, NOW);
    expect(getStore().activity[0]).toMatchObject({
      companyId: null, userId: u.id, actor: ACTOR,
      action: "Donnée personnelle révélée : téléphone de khady-faye.matam-express",
    });
    expect(() => usersRepo.logReveal("nope", "email", ACTOR, NOW)).toThrow("Utilisateur introuvable");
  });

  it("shows the reveal on the account activity tab", () => {
    const u = userBy("khady-faye.matam-express");
    usersRepo.logReveal(u.id, "email", ACTOR, NOW);
    expect(usersRepo.detail(u.id, NOW)!.activity.map((a) => a.action))
      .toEqual(["Donnée personnelle révélée : e-mail de khady-faye.matam-express"]);
  });
});

describe("activity log stays free of contact data", () => {
  it("contains no account e-mail or phone after every kind of access action", () => {
    const s = getStore();
    usersRepo.changeRole(userBy("ibrahima-sow.dakar-voyages").id, "MANAGER", "Promotion", ACTOR, NOW);
    usersRepo.revokeAllSessions(userBy("lamine.camara").id, "Appareil perdu", ACTOR, NOW);
    sessionsRepo.revoke(activeOf(userBy("ndeye.diouf").id)[0]!.id, "Suspecte", ACTOR, NOW);
    usersRepo.logReveal(userBy("khady-faye.matam-express").id, "email", ACTOR, NOW);
    usersRepo.logReveal(userBy("khady-faye.matam-express").id, "phone", ACTOR, NOW);
    const log = JSON.stringify(s.activity);
    expect(s.activity.filter((a) => a.userId !== undefined)).toHaveLength(5);
    for (const u of s.users) {
      expect(log).not.toContain(u.email);
      expect(log).not.toContain(u.phone);
    }
  });
});
