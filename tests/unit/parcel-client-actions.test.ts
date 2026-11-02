import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { declareParcelLost, revealParcelRecipientPhone } from "@/app/(admin)/colis/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const parcelNamed = (name: string) => getStore().parcels.find((p) => p.recipientName === name)!;

describe("declareParcelLost", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = parcelNamed("Dior Kébé");
    const n = getStore().activity.length;
    expect(await declareParcelLost(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("IN_TRANSIT");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("declares the parcel lost, journals the actor and revalidates the affected pages", async () => {
    const target = parcelNamed("Dior Kébé");
    expect(await declareParcelLost(target.id, " Introuvable au hub ")).toEqual({ ok: true });
    expect(target.status).toBe("LOST");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toEqual(expect.arrayContaining(["/colis", `/colis/${target.id}`, `/compagnies/${target.companyId}`]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = parcelNamed("Dior Kébé");
    expect(await declareParcelLost(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("IN_TRANSIT");
    expect(await declareParcelLost(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("LOST");
  });

  it("returns the rule's message as an error result", async () => {
    expect(await declareParcelLost(parcelNamed("Gorgui Sall").id, "motif")).toEqual({
      ok: false, error: "Un colis en attente ne peut pas être déclaré perdu",
    });
    expect(await declareParcelLost(parcelNamed("Yacine Ndoye").id, "motif")).toEqual({ ok: false, error: "Ce colis est déjà clos" });
    expect(await declareParcelLost("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Colis introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank id or a blank reason", async () => {
    expect((await declareParcelLost("", "motif")).ok).toBe(false);
    expect((await declareParcelLost(parcelNamed("Dior Kébé").id, "  ")).ok).toBe(false);
    expect(parcelNamed("Dior Kébé").status).toBe("IN_TRANSIT");
  });
});

describe("revealParcelRecipientPhone", () => {
  it("returns no value and logs nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().activity.length;
    expect(await revealParcelRecipientPhone(parcelNamed("Yacine Ndoye").id)).toEqual(EXPIRED);
    expect(getStore().activity).toHaveLength(n);
  });

  it("returns the number only after journaling the reveal, by the session actor", async () => {
    const target = parcelNamed("Yacine Ndoye");
    const n = getStore().activity.length;
    expect(await revealParcelRecipientPhone(target.id)).toEqual({ ok: true, value: target.recipientPhone });
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      actor: "tester@sira.app", companyId: target.companyId,
      action: `Donnée personnelle révélée : téléphone du destinataire du colis ${target.parcelCode}`,
    });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toContain(`/colis/${target.id}`);
  });

  it("refuses an unknown or blank parcel without logging", async () => {
    const n = getStore().activity.length;
    expect(await revealParcelRecipientPhone("00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "Colis introuvable" });
    expect(await revealParcelRecipientPhone("")).toEqual({ ok: false, error: "Colis invalide" });
    expect(getStore().activity).toHaveLength(n);
  });
});

import { ignoreFeedback } from "@/app/(admin)/clients/actions";

const feedbackTitled = (title: string) => getStore().feedbacks.find((f) => f.title === title)!;
const PENDING_TITLE = "Climatisation en panne pendant le trajet";
const RESOLVED_TITLE = "Service impeccable au guichet";

describe("ignoreFeedback", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = feedbackTitled(PENDING_TITLE);
    const n = getStore().activity.length;
    expect(await ignoreFeedback(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("ignores the review, journals the actor and revalidates the affected pages", async () => {
    const target = feedbackTitled(PENDING_TITLE);
    expect(await ignoreFeedback(target.id, " Propos injurieux ")).toEqual({ ok: true });
    expect(target.status).toBe("IGNORED");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    const paths = revalidatePath.mock.calls.map((c) => c[0] as string);
    expect(paths).toEqual(expect.arrayContaining([
      "/clients/avis", `/clients/avis/${target.id}`, `/clients/comptes/${target.customerId}`, `/compagnies/${target.companyId}`,
    ]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = feedbackTitled(PENDING_TITLE);
    expect(await ignoreFeedback(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("PENDING");
    expect(await ignoreFeedback(target.id, "x".repeat(500))).toEqual({ ok: true });
    expect(target.status).toBe("IGNORED");
  });

  it("returns the rule's message as an error result", async () => {
    expect(await ignoreFeedback(feedbackTitled(RESOLVED_TITLE).id, "motif")).toEqual({ ok: false, error: "Cet avis est déjà traité" });
    expect(await ignoreFeedback("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Avis introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank id or a blank reason", async () => {
    expect((await ignoreFeedback("", "motif")).ok).toBe(false);
    expect((await ignoreFeedback(feedbackTitled(PENDING_TITLE).id, "  ")).ok).toBe(false);
    expect(feedbackTitled(PENDING_TITLE).status).toBe("PENDING");
  });
});
