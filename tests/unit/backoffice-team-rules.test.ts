import { beforeEach, describe, expect, it } from "vitest";
import { adminsRepo } from "@/lib/repos/backoffice";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const SELF = "admin@sira.app";
beforeEach(() => resetStore(NOW));

const byIdentifier = (identifier: string) => getStore().backofficeAdmins.find((a) => a.identifier === identifier)!;
const MOUSTAPHA = "moustapha.ndiaye@sira.app";
const activeSessions = (id: string) =>
  getStore().backofficeSessions.filter((s) => s.adminId === id && s.revokedAt === null && Date.parse(s.expiresAt) > NOW.getTime());
const counts = () => ({ admins: getStore().backofficeAdmins.length, activity: getStore().activity.length });
const invite = (over: Partial<{ identifier: string; displayName: string }> = {}) =>
  adminsRepo.invite({ identifier: "nouveau.admin@sira.app", displayName: "Nouvel Admin", ...over }, SELF, NOW);

describe("inviting an administrator", () => {
  it("creates an invited account with no TOTP and no session, and journals it", () => {
    const before = counts();
    const a = invite({ identifier: "  Nouveau.Admin@SIRA.app ", displayName: "  Nouvel Admin  " });
    expect(a).toMatchObject({
      identifier: "nouveau.admin@sira.app", displayName: "Nouvel Admin", status: "invited", totpEnabled: false,
      totpEnrolledAt: null, recoveryCodesRemaining: 0, lastLoginAt: null, createdAt: NOW.toISOString(),
    });
    expect(getStore().backofficeAdmins.at(-1)).toBe(a);
    expect(getStore().backofficeSessions.some((s) => s.adminId === a.id)).toBe(false);
    expect(counts()).toEqual({ admins: before.admins + 1, activity: before.activity + 1 });
    expect(getStore().activity[0]).toMatchObject({ companyId: null, actor: SELF, at: NOW.toISOString(), action: "Administrateur invité : nouveau.admin@sira.app" });
  });

  it("refuses a blank identifier and a badly formed one", () => {
    expect(() => invite({ identifier: "   " })).toThrow("L'identifiant est obligatoire");
    for (const bad of ["sans-arobase", "a@sira.app", "x y@sira.app", "nom@gmail.com", "nom@sira.app.evil.com", "NOM@sira.sn", `${"a".repeat(41)}@sira.app`]) {
      expect(() => invite({ identifier: bad }), bad).toThrow("L'identifiant doit avoir la forme prenom.nom@sira.app");
    }
    expect(() => invite({ identifier: `${"a".repeat(40)}@sira.app` })).not.toThrow();
  });

  it("refuses a blank or too long name", () => {
    expect(() => invite({ displayName: "  " })).toThrow("Le nom est obligatoire");
    expect(() => invite({ displayName: "n".repeat(101) })).toThrow("Le nom est trop long (100 caractères maximum)");
    expect(() => invite({ displayName: "n".repeat(100) })).not.toThrow();
  });

  it("refuses an identifier that already exists, whatever its case", () => {
    expect(() => invite({ identifier: "Admin@sira.app" })).toThrow("Cet identifiant existe déjà");
    invite();
    expect(() => invite()).toThrow("Cet identifiant existe déjà");
  });

  it("changes nothing when a guard refuses, and checks the guards in order", () => {
    const before = counts();
    expect(() => invite({ identifier: "" })).toThrow();
    expect(() => invite({ identifier: "admin@sira.app", displayName: "" })).toThrow("Le nom est obligatoire");
    expect(() => adminsRepo.invite({ identifier: "mal formé", displayName: "" }, SELF, NOW)).toThrow("L'identifiant doit avoir la forme");
    expect(counts()).toEqual(before);
  });
});

describe("suspending an administrator", () => {
  it("suspends, revokes every active session with the reason « Compte suspendu » and journals the motif", () => {
    const fatou = byIdentifier("fatou.diallo@sira.app");
    const before = counts();
    adminsRepo.suspend(fatou.id, "  Départ de l'équipe  ", SELF, NOW);
    expect(fatou.status).toBe("suspended");
    expect(activeSessions(fatou.id)).toHaveLength(0);
    const revoked = getStore().backofficeSessions.filter((s) => s.adminId === fatou.id && s.revokedAt === NOW.toISOString());
    expect(revoked).toHaveLength(2);
    expect(revoked.every((s) => s.revokedReason === "Compte suspendu")).toBe(true);
    expect(counts().activity).toBe(before.activity + 1);
    expect(getStore().activity[0]!.action).toBe("Administrateur fatou.diallo@sira.app suspendu (2 session(s) révoquée(s)). Motif : Départ de l'équipe");
    expect(getStore().activity[0]!.actor).toBe(SELF);
  });

  it("keeps the sessions already revoked or expired as they were", () => {
    const self = byIdentifier(SELF);
    const expired = getStore().backofficeSessions.find((s) => s.adminId === self.id && !s.current && Date.parse(s.expiresAt) <= NOW.getTime())!;
    adminsRepo.suspend(self.id, "Test", "someone@sira.app", NOW);
    expect(expired.revokedAt).toBeNull();
    expect(activeSessions(self.id)).toHaveLength(0);
  });

  it("refuses an unknown administrator, then a blank or too long motif", () => {
    expect(() => adminsRepo.suspend("inconnu", "x", SELF, NOW)).toThrow("Administrateur introuvable");
    const id = byIdentifier(MOUSTAPHA).id;
    expect(() => adminsRepo.suspend(id, "   ", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.suspend(id, "m".repeat(501), SELF, NOW)).toThrow("Motif trop long (500 caractères maximum)");
    expect(() => adminsRepo.suspend(id, "m".repeat(500), SELF, NOW)).not.toThrow();
  });

  it("refuses to suspend oneself, a suspended account and an invited one", () => {
    expect(() => adminsRepo.suspend(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("Impossible de suspendre son propre compte");
    expect(() => adminsRepo.suspend(byIdentifier("seynabou.kane@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas actif");
    expect(() => adminsRepo.suspend(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas actif");
  });

  it("refuses to suspend the last active administrator", () => {
    for (const a of getStore().backofficeAdmins) if (a.identifier !== MOUSTAPHA && a.status === "active") a.status = "suspended";
    expect(() => adminsRepo.suspend(byIdentifier(MOUSTAPHA).id, "x", "someone@sira.app", NOW)).toThrow(
      "Impossible de suspendre le dernier administrateur actif",
    );
    expect(byIdentifier(MOUSTAPHA).status).toBe("active");
  });

  it("changes nothing when a guard refuses, and checks the guards in order", () => {
    const before = counts();
    expect(() => adminsRepo.suspend(byIdentifier(SELF).id, "", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.suspend(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("son propre compte");
    expect(() => adminsRepo.suspend(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("pas actif");
    expect(counts()).toEqual(before);
    expect(activeSessions(byIdentifier(SELF).id)).toHaveLength(3);
  });
});

describe("reactivating an administrator", () => {
  it("reactivates a suspended account and journals the motif, without restoring sessions", () => {
    const kane = byIdentifier("seynabou.kane@sira.app");
    const sessionsBefore = getStore().backofficeSessions.filter((s) => s.adminId === kane.id).map((s) => s.revokedAt);
    adminsRepo.reactivate(kane.id, "Retour de congé", SELF, NOW);
    expect(kane.status).toBe("active");
    expect(getStore().backofficeSessions.filter((s) => s.adminId === kane.id).map((s) => s.revokedAt)).toEqual(sessionsBefore);
    expect(getStore().activity[0]!.action).toBe("Administrateur seynabou.kane@sira.app réactivé. Motif : Retour de congé");
  });

  it("refuses unknown, blank motif and an account that is not suspended, in that order", () => {
    expect(() => adminsRepo.reactivate("inconnu", "", SELF, NOW)).toThrow("Administrateur introuvable");
    const kane = byIdentifier("seynabou.kane@sira.app");
    expect(() => adminsRepo.reactivate(kane.id, " ", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.reactivate(byIdentifier(MOUSTAPHA).id, "x", SELF, NOW)).toThrow("Le compte n'est pas suspendu");
    expect(() => adminsRepo.reactivate(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas suspendu");
    expect(kane.status).toBe("suspended");
  });
});

describe("resetting the TOTP of an administrator", () => {
  it("disables the TOTP, clears the codes, revokes sessions with the reason « TOTP réinitialisé » and journals", () => {
    const m = byIdentifier(MOUSTAPHA);
    adminsRepo.resetTotp(m.id, "Téléphone perdu", SELF, NOW);
    expect(m).toMatchObject({ status: "active", totpEnabled: false, totpEnrolledAt: null, recoveryCodesRemaining: 0 });
    expect(activeSessions(m.id)).toHaveLength(0);
    expect(getStore().backofficeSessions.filter((s) => s.adminId === m.id).every((s) => s.revokedReason === "TOTP réinitialisé")).toBe(true);
    expect(getStore().activity[0]!.action).toBe(`TOTP de ${MOUSTAPHA} réinitialisé (1 session(s) révoquée(s)). Motif : Téléphone perdu`);
  });

  it("refuses in order: unknown, motif, oneself, not active, no TOTP", () => {
    expect(() => adminsRepo.resetTotp("inconnu", "x", SELF, NOW)).toThrow("Administrateur introuvable");
    const m = byIdentifier(MOUSTAPHA);
    expect(() => adminsRepo.resetTotp(m.id, "", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.resetTotp(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("Impossible de réinitialiser son propre TOTP");
    expect(() => adminsRepo.resetTotp(byIdentifier("seynabou.kane@sira.app").id, "x", SELF, NOW)).toThrow("Le compte n'est pas actif");
    adminsRepo.resetTotp(m.id, "x", SELF, NOW);
    expect(() => adminsRepo.resetTotp(m.id, "x", SELF, NOW)).toThrow("Aucun TOTP à réinitialiser");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => adminsRepo.resetTotp(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow();
    expect(byIdentifier(SELF).totpEnabled).toBe(true);
    expect(counts()).toEqual(before);
  });
});

describe("revoking the sessions of an administrator", () => {
  it("revokes every active session with the motif and journals the count", () => {
    const fatou = byIdentifier("fatou.diallo@sira.app");
    adminsRepo.revokeSessions(fatou.id, "Poste partagé", SELF, NOW);
    expect(activeSessions(fatou.id)).toHaveLength(0);
    expect(getStore().backofficeSessions.filter((s) => s.adminId === fatou.id).every((s) => s.revokedReason === "Poste partagé")).toBe(true);
    expect(fatou.status).toBe("active");
    expect(getStore().activity[0]!.action).toBe("2 session(s) de fatou.diallo@sira.app révoquée(s). Motif : Poste partagé");
  });

  it("refuses in order: unknown, motif, oneself, no active session", () => {
    expect(() => adminsRepo.revokeSessions("inconnu", "x", SELF, NOW)).toThrow("Administrateur introuvable");
    const fatou = byIdentifier("fatou.diallo@sira.app");
    expect(() => adminsRepo.revokeSessions(fatou.id, " ", SELF, NOW)).toThrow("Un motif est obligatoire");
    expect(() => adminsRepo.revokeSessions(byIdentifier(SELF).id, "x", SELF, NOW)).toThrow("Pour tes propres sessions, utilise ton profil");
    expect(() => adminsRepo.revokeSessions(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow("Aucune session active à révoquer");
    expect(() => adminsRepo.revokeSessions(byIdentifier("seynabou.kane@sira.app").id, "x", SELF, NOW)).toThrow("Aucune session active à révoquer");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => adminsRepo.revokeSessions(byIdentifier("awa.fall@sira.app").id, "x", SELF, NOW)).toThrow();
    expect(counts()).toEqual(before);
  });
});

describe("what the journal never receives", () => {
  it("holds no IP address, no e-mail and no phone number after every team action", () => {
    adminsRepo.suspend(byIdentifier("fatou.diallo@sira.app").id, "Motif", SELF, NOW);
    adminsRepo.resetTotp(byIdentifier(MOUSTAPHA).id, "Motif", SELF, NOW);
    adminsRepo.reactivate(byIdentifier("seynabou.kane@sira.app").id, "Motif", SELF, NOW);
    invite();
    const text = JSON.stringify(getStore().activity.slice(0, 4)).replace(/[a-z.]+@sira\.app/g, "");
    expect(text).not.toMatch(/@|\+221|\d+\.\d+\.\d+\.\d+/);
  });
});
