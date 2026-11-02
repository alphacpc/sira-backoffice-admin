import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { revokeSession } from "@/app/(admin)/acces/actions";
import { changeUserRole, revealUserContact, revokeUserSessions } from "@/app/(admin)/utilisateurs/actions";
import { sessionState } from "@/lib/repos/access";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
const TOO_LONG = { ok: false, error: "Motif trop long (500 caractères maximum)" };

beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const userBy = (username: string) => getStore().users.find((u) => u.username === username)!;
const activeOf = (userId: string) =>
  getStore().sessions.filter((x) => x.userId === userId && sessionState(x, new Date()) === "active");
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("without a session nothing is read or written", () => {
  beforeEach(() => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
  });

  it("changeUserRole", async () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    const n = getStore().activity.length;
    expect(await changeUserRole(u.id, "MANAGER", "motif")).toEqual(EXPIRED);
    expect(u.roleCode).toBe("GUICHETIER");
    expect(activeOf(u.id)).toHaveLength(2);
    expect(getStore().activity.length).toBe(n);
  });

  it("revokeUserSessions", async () => {
    const u = userBy("lamine.camara");
    expect(await revokeUserSessions(u.id, "motif")).toEqual(EXPIRED);
    expect(activeOf(u.id)).toHaveLength(3);
  });

  it("revokeSession", async () => {
    const target = activeOf(userBy("lamine.camara").id)[0]!;
    expect(await revokeSession(target.id, "motif")).toEqual(EXPIRED);
    expect(target.revokedAt).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("revealUserContact returns no value and logs nothing", async () => {
    const n = getStore().activity.length;
    const r = await revealUserContact(userBy("khady-faye.matam-express").id, "email");
    expect(r).toEqual(EXPIRED);
    expect("value" in r).toBe(false);
    expect(getStore().activity.length).toBe(n);
  });
});

describe("changeUserRole", () => {
  it("changes the role by the session actor, revokes the sessions and revalidates", async () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(await changeUserRole(u.id, "MANAGER", "  Promotion  ")).toEqual({ ok: true });
    expect(u.roleCode).toBe("MANAGER");
    expect(activeOf(u.id)).toHaveLength(0);
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", userId: u.id });
    expect(getStore().activity[0]!.action).toMatch(/Motif : Promotion$/);
    expect(paths()).toEqual(expect.arrayContaining([
      "/utilisateurs", `/utilisateurs/${u.id}`, "/acces/roles", "/acces/sessions",
    ]));
  });

  it("refuses a blank reason, 501 characters, and accepts exactly 500", async () => {
    const u = userBy("ibrahima-sow.dakar-voyages");
    expect(await changeUserRole(u.id, "MANAGER", "   ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await changeUserRole(u.id, "MANAGER", "x".repeat(501))).toEqual(TOO_LONG);
    expect(u.roleCode).toBe("GUICHETIER");
    expect(await changeUserRole(u.id, "MANAGER", "x".repeat(500))).toEqual({ ok: true });
  });

  it("refuses invalid identifiers and returns the repository refusals", async () => {
    expect(await changeUserRole("", "MANAGER", "x")).toEqual({ ok: false, error: "Utilisateur invalide" });
    expect(await changeUserRole(userBy("lamine.camara").id, 42 as never, "x")).toEqual({ ok: false, error: "Rôle invalide" });
    expect(await changeUserRole(userBy("lamine.camara").id, "ROOT", "x")).toEqual({ ok: false, error: "Rôle inconnu" });
    expect(await changeUserRole(userBy("moustapha.ndiaye").id, "MANAGER", "x")).toEqual({
      ok: false, error: "Impossible de rétrograder le dernier administrateur actif",
    });
  });

  it("refuses to change the role of the account matching the session identity", async () => {
    const u = userBy("lamine.camara");
    requireSession.mockResolvedValue({ ...session, sub: u.email });
    expect(await changeUserRole(u.id, "MANAGER", "x")).toEqual({ ok: false, error: "Impossible de changer son propre rôle" });
    expect(u.roleCode).toBe("USER");
  });
});

describe("revokeUserSessions", () => {
  it("revokes every active session and revalidates", async () => {
    const u = userBy("lamine.camara");
    expect(await revokeUserSessions(u.id, "Appareil perdu")).toEqual({ ok: true });
    expect(activeOf(u.id)).toHaveLength(0);
    expect(paths()).toEqual(expect.arrayContaining(["/acces/sessions", `/utilisateurs/${u.id}`]));
  });

  it("returns the refusal when nothing is active, and refuses a too long reason", async () => {
    expect(await revokeUserSessions(userBy("pape.mbaye").id, "x")).toEqual({ ok: false, error: "Aucune session active à révoquer" });
    expect(await revokeUserSessions(userBy("lamine.camara").id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(activeOf(userBy("lamine.camara").id)).toHaveLength(3);
  });
});

describe("revokeSession", () => {
  it("revokes the session by the session actor and revalidates the account page", async () => {
    const u = userBy("lamine.camara");
    const target = activeOf(u.id)[0]!;
    expect(await revokeSession(target.id, "Session suspecte")).toEqual({ ok: true });
    expect(target.revokedReason).toBe("Session suspecte");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", userId: u.id });
    expect(paths()).toEqual(expect.arrayContaining(["/acces/sessions", "/utilisateurs", `/utilisateurs/${u.id}`]));
  });

  it("refuses a blank or too long reason, an invalid id and an already revoked session", async () => {
    const target = activeOf(userBy("lamine.camara").id)[0]!;
    expect(await revokeSession(target.id, " ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await revokeSession(target.id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(await revokeSession("", "x")).toEqual({ ok: false, error: "Session invalide" });
    expect(target.revokedAt).toBeNull();
    await revokeSession(target.id, "x");
    expect(await revokeSession(target.id, "x")).toEqual({ ok: false, error: "La session est déjà révoquée ou expirée" });
  });
});

describe("revealUserContact", () => {
  it("returns the value only after journaling, by the session actor", async () => {
    const u = userBy("khady-faye.matam-express");
    expect(await revealUserContact(u.id, "email")).toEqual({ ok: true, value: "khady-faye@matam-express.sn" });
    expect(await revealUserContact(u.id, "phone")).toEqual({ ok: true, value: u.phone });
    expect(getStore().activity.slice(0, 2).map((a) => [a.actor, a.userId, a.action])).toEqual([
      ["tester@sira.app", u.id, "Donnée personnelle révélée : téléphone de khady-faye.matam-express"],
      ["tester@sira.app", u.id, "Donnée personnelle révélée : e-mail de khady-faye.matam-express"],
    ]);
    expect(paths()).toContain(`/utilisateurs/${u.id}`);
  });

  it("refuses an invalid field or an unknown account without logging", async () => {
    const n = getStore().activity.length;
    const bad = await revealUserContact(userBy("khady-faye.matam-express").id, "address" as never);
    expect(bad).toEqual({ ok: false, error: "Champ invalide" });
    expect(await revealUserContact("nope", "email")).toEqual({ ok: false, error: "Utilisateur introuvable" });
    expect(await revealUserContact("", "email")).toEqual({ ok: false, error: "Utilisateur invalide" });
    expect(getStore().activity.length).toBe(n);
  });
});
