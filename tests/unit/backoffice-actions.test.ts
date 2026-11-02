import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import {
  inviteAdmin, reactivateAdmin, resetAdminTotp, revokeAdminSessions, suspendAdmin,
} from "@/app/(admin)/parametres/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "admin@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const byIdentifier = (identifier: string) => getStore().backofficeAdmins.find((a) => a.identifier === identifier)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("team actions", () => {
  it("write nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().backofficeAdmins.length;
    const ibrahima = byIdentifier("ibrahima.sow@sira.app");
    expect(await inviteAdmin({ identifier: "x.y@sira.app", displayName: "X" })).toEqual(EXPIRED);
    expect(await suspendAdmin(ibrahima.id, "x")).toEqual(EXPIRED);
    expect(await reactivateAdmin(byIdentifier("seynabou.kane@sira.app").id, "x")).toEqual(EXPIRED);
    expect(await resetAdminTotp(byIdentifier("moustapha.ndiaye@sira.app").id, "x")).toEqual(EXPIRED);
    expect(await revokeAdminSessions(byIdentifier("fatou.diallo@sira.app").id, "x")).toEqual(EXPIRED);
    expect(getStore().backofficeAdmins).toHaveLength(n);
    expect(ibrahima.status).toBe("active");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("invite as the session actor and revalidate the team and the journal", async () => {
    expect(await inviteAdmin({ identifier: "x.y@sira.app", displayName: "X Y" })).toEqual({ ok: true });
    expect(byIdentifier("x.y@sira.app").status).toBe("invited");
    expect(getStore().activity[0]!.actor).toBe("admin@sira.app");
    expect(paths()).toEqual(expect.arrayContaining(["/parametres/equipe-admin", "/parametres/journal-backoffice"]));
  });

  it("suspend, reactivate, reset the TOTP and revoke sessions", async () => {
    expect(await suspendAdmin(byIdentifier("ibrahima.sow@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(byIdentifier("ibrahima.sow@sira.app").status).toBe("suspended");
    expect(await reactivateAdmin(byIdentifier("seynabou.kane@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(byIdentifier("seynabou.kane@sira.app").status).toBe("active");
    expect(await resetAdminTotp(byIdentifier("moustapha.ndiaye@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(byIdentifier("moustapha.ndiaye@sira.app").totpEnabled).toBe(false);
    expect(await revokeAdminSessions(byIdentifier("fatou.diallo@sira.app").id, "Motif")).toEqual({ ok: true });
    expect(paths()).toEqual(expect.arrayContaining(["/parametres/equipe-admin", "/parametres/journal-backoffice"]));
  });

  it("return the rule's message and revalidate nothing when a rule refuses", async () => {
    expect(await inviteAdmin({ identifier: "mal formé", displayName: "X" })).toEqual({
      ok: false, error: "L'identifiant doit avoir la forme prenom.nom@sira.app",
    });
    expect(await suspendAdmin(byIdentifier("admin@sira.app").id, "x")).toEqual({ ok: false, error: "Impossible de suspendre son propre compte" });
    expect(await suspendAdmin(byIdentifier("ibrahima.sow@sira.app").id, " ")).toEqual({ ok: false, error: "Un motif est obligatoire" });
    expect(await suspendAdmin("inconnu", "x")).toEqual({ ok: false, error: "Administrateur introuvable" });
    expect((await suspendAdmin("", "x")).ok).toBe(false);
    expect((await revokeAdminSessions("", "x")).ok).toBe(false);
    expect(byIdentifier("ibrahima.sow@sira.app").status).toBe("active");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
  it("answer cleanly, without a raw TypeError, to inputs of the wrong type", async () => {
    const n = getStore().backofficeAdmins.length;
    const bad = [null, undefined, 42, {}, { identifier: 1, displayName: "X" }, { identifier: "x.y@sira.app", displayName: null }];
    for (const input of bad) {
      const r = await inviteAdmin(input as never);
      expect(r.ok).toBe(false);
      expect((r as { error: string }).error).not.toMatch(/undefined|null|trim|Cannot read/i);
    }
    const id = byIdentifier("ibrahima.sow@sira.app").id;
    for (const reason of [null, undefined, 7, {}]) {
      for (const act of [suspendAdmin, reactivateAdmin, resetAdminTotp, revokeAdminSessions]) {
        const r = await act(id, reason as never);
        expect(r).toEqual({ ok: false, error: "Motif invalide" });
      }
    }
    for (const badId of [null, 5, {}]) expect(await suspendAdmin(badId as never, "x")).toEqual({ ok: false, error: "Administrateur invalide" });
    expect(getStore().backofficeAdmins).toHaveLength(n);
    expect(byIdentifier("ibrahima.sow@sira.app").status).toBe("active");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
