import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { cancelSubscription, retrySubscriptionPayment } from "@/app/(admin)/facturation/actions";
import { setKycTypeActive } from "@/app/(admin)/offre/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const TOO_LONG = { ok: false, error: "Motif trop long (500 caractères maximum)" };

beforeEach(() => {
  resetStore(NOW);
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const subOf = (companyName: string) => {
  const s = getStore();
  const c = s.companies.find((x) => x.name === companyName)!;
  return s.subscriptions.find((x) => x.companyId === c.id)!;
};
const kycType = (code: string) => getStore().kycTypes.find((t) => t.code === code)!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("without a session nothing is read or written", () => {
  beforeEach(() => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
  });
  const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };

  it("retrySubscriptionPayment", async () => {
    const sub = subOf("Baobab Lines");
    const attempts = getStore().paymentAttempts.length;
    expect(await retrySubscriptionPayment(sub.id)).toEqual(EXPIRED);
    expect(sub.status).toBe("past_due");
    expect(getStore().paymentAttempts.length).toBe(attempts);
  });

  it("cancelSubscription", async () => {
    const sub = subOf("Touba Liaison");
    const activity = getStore().activity.length;
    expect(await cancelSubscription(sub.id, "motif")).toEqual(EXPIRED);
    expect(sub.status).toBe("active");
    expect(getStore().activity.length).toBe(activity);
  });

  it("setKycTypeActive", async () => {
    expect(await setKycTypeActive("NINEA", false, "motif")).toEqual(EXPIRED);
    expect(kycType("NINEA").active).toBe(true);
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("retrySubscriptionPayment", () => {
  it("reactivates on success, by the session actor, and revalidates billing pages", async () => {
    const sub = subOf("Baobab Lines");
    expect(await retrySubscriptionPayment(sub.id)).toEqual({ ok: true });
    expect(sub.status).toBe("active");
    expect(getStore().activity[0]!.actor).toBe("tester@sira.app");
    expect(paths()).toEqual(expect.arrayContaining([
      "/", "/facturation/abonnements", "/facturation/impayes", "/facturation/paiements",
      "/facturation/factures", `/facturation/abonnements/${sub.id}`, `/compagnies/${sub.companyId}`,
    ]));
  });

  it("returns the refusal as an error but keeps the failed attempt", async () => {
    const sub = subOf("Saint-Louis Route");
    const attempts = getStore().paymentAttempts.length;
    expect(await retrySubscriptionPayment(sub.id)).toEqual({
      ok: false, error: "Échec du paiement : Paiement refusé par l'opérateur (simulation)",
    });
    expect(getStore().paymentAttempts.length).toBe(attempts + 1);
    expect(sub.status).toBe("past_due");
    expect(paths()).toContain("/facturation/impayes");
  });

  it("refuses a subscription that is neither unpaid nor suspended", async () => {
    expect(await retrySubscriptionPayment(subOf("Sahel Express").id)).toEqual({
      ok: false, error: "Relance impossible : l'abonnement n'est ni impayé ni suspendu",
    });
  });

  it("refuses an invalid identifier", async () => {
    expect(await retrySubscriptionPayment("")).toEqual({ ok: false, error: "Abonnement invalide" });
    expect(await retrySubscriptionPayment(42 as never)).toEqual({ ok: false, error: "Abonnement invalide" });
  });
});

describe("cancelSubscription", () => {
  it("refuses a blank reason and changes nothing", async () => {
    const sub = subOf("Touba Liaison");
    for (const reason of ["", "   "]) {
      expect(await cancelSubscription(sub.id, reason)).toEqual({ ok: false, error: "Motif invalide" });
    }
    expect(sub.status).toBe("active");
  });

  it("refuses 501 characters and accepts exactly 500", async () => {
    const sub = subOf("Touba Liaison");
    expect(await cancelSubscription(sub.id, "x".repeat(501))).toEqual(TOO_LONG);
    expect(sub.status).toBe("active");
    expect(await cancelSubscription(sub.id, "x".repeat(500))).toEqual({ ok: true });
  });

  it("cancels with the trimmed reason recorded by the session actor", async () => {
    const sub = subOf("Touba Liaison");
    expect(await cancelSubscription(sub.id, "  Fin de contrat  ")).toEqual({ ok: true });
    expect(sub.status).toBe("canceled");
    expect(getStore().activity[0]).toMatchObject({
      actor: "tester@sira.app", action: "Abonnement annulé. Motif : Fin de contrat",
    });
    expect(paths()).toContain(`/facturation/abonnements/${sub.id}`);
  });

  it("returns the repository refusal for an expired subscription", async () => {
    expect(await cancelSubscription(subOf("Matam Express").id, "motif")).toEqual({
      ok: false, error: "L'abonnement est déjà annulé ou expiré",
    });
  });
});

describe("setKycTypeActive", () => {
  it("deactivates by the session actor and revalidates", async () => {
    expect(await setKycTypeActive("NINEA", false, "  Exigence levée  ")).toEqual({ ok: true });
    expect(kycType("NINEA").active).toBe(false);
    expect(getStore().activity[0]).toMatchObject({ companyId: null, actor: "tester@sira.app" });
    expect(paths()).toEqual(expect.arrayContaining(["/offre/types-documents-kyc", "/compagnies", "/compagnies/kyc", "/"]));
  });

  it("refuses a blank or too long reason", async () => {
    expect(await setKycTypeActive("NINEA", false, " ")).toEqual({ ok: false, error: "Motif invalide" });
    expect(await setKycTypeActive("NINEA", false, "x".repeat(501))).toEqual(TOO_LONG);
    expect(kycType("NINEA").active).toBe(true);
  });

  it("refuses a non-boolean state", async () => {
    expect(await setKycTypeActive("NINEA", "false" as never, "motif")).toEqual({ ok: false, error: "État invalide" });
    expect(kycType("NINEA").active).toBe(true);
  });

  it("returns the refusal for the last active required type", async () => {
    const codes = getStore().kycTypes.map((t) => t.code);
    for (const code of codes.slice(0, -1)) await setKycTypeActive(code, false, "test");
    expect(await setKycTypeActive(codes.at(-1)!, false, "test")).toEqual({
      ok: false, error: "Impossible de désactiver le dernier type de document obligatoire actif",
    });
  });
});
