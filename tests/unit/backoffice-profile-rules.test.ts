import { beforeEach, describe, expect, it } from "vitest";
import { profileRepo, RECOVERY_CODE_COUNT } from "@/lib/repos/backoffice";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const SELF = "admin@sira.app";
const OUTSIDER = "someone@sira.app";
beforeEach(() => resetStore(NOW));

const me = () => getStore().backofficeAdmins.find((a) => a.identifier === SELF)!;
const mine = () => getStore().backofficeSessions.filter((s) => s.adminId === me().id);
const sessionNamed = (device: string) => mine().find((s) => s.deviceLabel === device)!;
const isActive = (s: { revokedAt: string | null; expiresAt: string }) => s.revokedAt === null && Date.parse(s.expiresAt) > NOW.getTime();
const counts = () => ({ activity: getStore().activity.length });

describe("changing my display name", () => {
  it("trims, stores and journals without the name", () => {
    profileRepo.updateDisplayName(SELF, "  Admin Principal  ", NOW);
    expect(me().displayName).toBe("Admin Principal");
    expect(getStore().activity[0]).toMatchObject({ companyId: null, actor: SELF, at: NOW.toISOString(), action: "Nom affiché de admin@sira.app modifié" });
    expect(getStore().activity[0]!.action).not.toContain("Admin Principal");
  });

  it("refuses an actor outside the team, a blank name and a too long one, in that order", () => {
    expect(() => profileRepo.updateDisplayName(OUTSIDER, "", NOW)).toThrow("Compte introuvable");
    expect(() => profileRepo.updateDisplayName(SELF, "   ", NOW)).toThrow("Le nom est obligatoire");
    expect(() => profileRepo.updateDisplayName(SELF, "n".repeat(101), NOW)).toThrow("Le nom est trop long (100 caractères maximum)");
    expect(() => profileRepo.updateDisplayName(SELF, "n".repeat(100), NOW)).not.toThrow();
  });

  it("refuses a name that is not a string with a clean message", () => {
    for (const bad of [undefined, null, 42, {}]) {
      expect(() => profileRepo.updateDisplayName(SELF, bad as unknown as string, NOW)).toThrow("Nom invalide");
    }
    expect(me().displayName).toBe("Administrateur Sira");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => profileRepo.updateDisplayName(SELF, "", NOW)).toThrow();
    expect(me().displayName).toBe("Administrateur Sira");
    expect(counts()).toEqual(before);
  });
});

describe("revoking one of my sessions", () => {
  it("revokes it with the reason « Révoquée par le titulaire » and journals the device", () => {
    const android = sessionNamed("Application Android");
    profileRepo.revokeSession(SELF, android.id, NOW);
    expect(android.revokedAt).toBe(NOW.toISOString());
    expect(android.revokedReason).toBe("Révoquée par le titulaire");
    expect(mine().filter(isActive)).toHaveLength(2);
    expect(getStore().activity[0]!.action).toBe("Session révoquée (Application Android)");
  });

  it("refuses an unknown session and a session of another administrator", () => {
    expect(() => profileRepo.revokeSession(SELF, "inconnue", NOW)).toThrow("Session introuvable");
    const other = getStore().backofficeSessions.find((s) => s.adminId !== me().id)!;
    const otherBefore = other.revokedAt;
    expect(() => profileRepo.revokeSession(SELF, other.id, NOW)).toThrow("Session introuvable");
    expect(other.revokedAt).toBe(otherBefore);
    expect(() => profileRepo.revokeSession(OUTSIDER, sessionNamed("Application Android").id, NOW)).toThrow("Compte introuvable");
  });

  it("refuses the current session, then one already revoked or expired", () => {
    const current = mine().find((s) => s.current)!;
    expect(() => profileRepo.revokeSession(SELF, current.id, NOW)).toThrow("Utilise la déconnexion pour fermer la session courante");
    expect(current.revokedAt).toBeNull();
    const expired = mine().find((s) => !s.current && !isActive(s))!;
    expect(() => profileRepo.revokeSession(SELF, expired.id, NOW)).toThrow("La session est déjà révoquée ou expirée");
    const android = sessionNamed("Application Android");
    profileRepo.revokeSession(SELF, android.id, NOW);
    expect(() => profileRepo.revokeSession(SELF, android.id, NOW)).toThrow("La session est déjà révoquée ou expirée");
  });

  it("checks the guards in order: account, ownership, current, active", () => {
    const current = mine().find((s) => s.current)!;
    current.revokedAt = NOW.toISOString();
    current.revokedReason = "x";
    expect(() => profileRepo.revokeSession(SELF, current.id, NOW)).toThrow("Utilise la déconnexion pour fermer la session courante");
  });

  it("changes nothing when a guard refuses", () => {
    const before = counts();
    expect(() => profileRepo.revokeSession(SELF, mine().find((s) => s.current)!.id, NOW)).toThrow();
    expect(counts()).toEqual(before);
  });
});

describe("revoking all my other sessions", () => {
  it("revokes the active ones except the current, keeps the expired one untouched, and journals the count", () => {
    const expired = mine().find((s) => !s.current && !isActive(s))!;
    profileRepo.revokeOthers(SELF, NOW);
    expect(mine().filter(isActive).map((s) => s.current)).toEqual([true]);
    expect(expired.revokedAt).toBeNull();
    expect(sessionNamed("Firefox · Ubuntu").revokedReason).toBe("Révoquée par le titulaire");
    expect(getStore().activity[0]!.action).toBe("2 autre(s) session(s) révoquée(s)");
  });

  it("refuses an actor outside the team and when nothing else is active", () => {
    expect(() => profileRepo.revokeOthers(OUTSIDER, NOW)).toThrow("Compte introuvable");
    profileRepo.revokeOthers(SELF, NOW);
    expect(() => profileRepo.revokeOthers(SELF, NOW)).toThrow("Aucune autre session active");
  });
});

describe("regenerating the recovery codes", () => {
  it("returns eight distinct XXXX-XXXX codes, resets the counter and journals without the codes", () => {
    me().recoveryCodesRemaining = 2;
    const codes = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    expect(codes).toHaveLength(RECOVERY_CODE_COUNT);
    expect(new Set(codes).size).toBe(RECOVERY_CODE_COUNT);
    for (const c of codes) expect(c).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}$/);
    expect(me().recoveryCodesRemaining).toBe(8);
    expect(getStore().activity[0]).toMatchObject({ actor: SELF, action: "Codes de récupération régénérés" });
  });

  it("never stores or journals the codes", () => {
    const codes = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    const stored = JSON.stringify([getStore().backofficeAdmins, getStore().backofficeSessions, getStore().activity]);
    for (const c of codes) expect(stored).not.toContain(c);
  });

  it("gives different codes each time", () => {
    const a = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    const b = profileRepo.regenerateRecoveryCodes(SELF, NOW);
    expect(a.some((c) => b.includes(c))).toBe(false);
  });

  it("refuses an actor outside the team and an account without TOTP", () => {
    expect(() => profileRepo.regenerateRecoveryCodes(OUTSIDER, NOW)).toThrow("Compte introuvable");
    me().totpEnabled = false;
    const before = counts();
    expect(() => profileRepo.regenerateRecoveryCodes(SELF, NOW)).toThrow("Le TOTP n'est pas activé");
    expect(counts()).toEqual(before);
  });
});
