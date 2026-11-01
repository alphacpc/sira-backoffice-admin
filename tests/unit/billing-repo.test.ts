import { beforeEach, describe, expect, it } from "vitest";
import {
  RETRY_FAILURE_REASON, invoicesRepo, paymentsRepo, subscriptionsRepo,
} from "@/lib/repos/billing";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const subOf = (companyName: string) => {
  const s = getStore();
  const c = s.companies.find((x) => x.name === companyName)!;
  return s.subscriptions.find((x) => x.companyId === c.id)!;
};
const attemptsOf = (subId: string) => getStore().paymentAttempts.filter((a) => a.subscriptionId === subId);

describe("subscriptionsRepo.listRows", () => {
  const ALLOWED = ["billingCycle", "companyId", "companyName", "currency", "id", "nextBillingDate", "planName", "price", "status"];

  it("returns the 15 subscriptions with exactly the allowed keys", () => {
    const rows = subscriptionsRepo.listRows();
    expect(rows).toHaveLength(15);
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(ALLOWED);
  });

  it("filters by status", () => {
    expect(subscriptionsRepo.listRows({ status: "past_due" }).map((r) => r.companyName).sort())
      .toEqual(["Baobab Lines", "Saint-Louis Route"]);
    expect(subscriptionsRepo.list({ status: "trial" })).toHaveLength(2);
  });
});

describe("subscriptionsRepo.detail", () => {
  it("returns undefined for an unknown id", () => {
    expect(subscriptionsRepo.detail("nope")).toBeUndefined();
  });

  it("returns the plan, history oldest first, payments and invoices newest first", () => {
    const sub = subOf("Teranga Bus");
    const d = subscriptionsRepo.detail(sub.id)!;
    expect(d.companyName).toBe("Teranga Bus");
    expect(d.plan?.name).toBe("Pro");
    expect(d.history.map((h) => h.kind)).toEqual(["ACTIVATION", "UPGRADE"]);
    expect(d.history[1]).toMatchObject({ fromPlan: "Starter", toPlan: "Pro" });
    const paid = d.payments.map((p) => p.at);
    expect([...paid].sort().reverse()).toEqual(paid);
    expect(d.payments.every((p) => p.invoiceNumber !== null)).toBe(true);
    expect(d.invoices.map((i) => i.issuedAt)).toEqual([...d.invoices.map((i) => i.issuedAt)].sort().reverse());
  });

  it("computes the action flags from the status", () => {
    const unpaid = subscriptionsRepo.detail(subOf("Baobab Lines").id)!;
    expect([unpaid.canRetry, unpaid.canCancel]).toEqual([true, true]);
    const active = subscriptionsRepo.detail(subOf("Sahel Express").id)!;
    expect([active.canRetry, active.canCancel]).toEqual([false, true]);
    const expired = subscriptionsRepo.detail(subOf("Matam Express").id)!;
    expect([expired.canRetry, expired.canCancel]).toEqual([false, false]);
    const canceled = subscriptionsRepo.detail(subOf("Richard-Toll Bus").id)!;
    expect([canceled.canRetry, canceled.canCancel]).toEqual([false, false]);
  });
});

describe("subscriptionsRepo.unpaidQueue", () => {
  const ALLOWED = ["companyId", "companyName", "currency", "daysLeft", "deadline", "id", "pastDueSince", "planName", "price", "status"];

  it("lists unpaid and suspended subscriptions, most urgent first", () => {
    const q = subscriptionsRepo.unpaidQueue(NOW);
    expect(q.map((r) => [r.companyName, r.deadline, r.daysLeft])).toEqual([
      ["Saint-Louis Route", "suspension", 2],
      ["Baobab Lines", "suspension", 5],
      ["Fatick Lines", "expiration", 17],
    ]);
    for (const r of q) expect(Object.keys(r).sort()).toEqual(ALLOWED);
  });

  it("counts whole days from pastDueSince to the injected reference date", () => {
    const sub = subOf("Baobab Lines");
    sub.pastDueSince = "2026-10-01T00:00:00.000Z";
    const at = (iso: string) =>
      subscriptionsRepo.unpaidQueue(new Date(iso)).find((r) => r.id === sub.id)!.daysLeft;
    expect(at("2026-10-03T12:00:00.000Z")).toBe(5);
    expect(at("2026-10-08T00:00:00.000Z")).toBe(0);
    expect(at("2026-10-10T00:00:00.000Z")).toBe(-2);
  });

  it("counts the expiration of a suspended subscription from the suspension date", () => {
    const sub = subOf("Fatick Lines");
    sub.pastDueSince = "2026-09-01T00:00:00.000Z";
    const row = subscriptionsRepo.unpaidQueue(new Date("2026-09-20T00:00:00.000Z")).find((r) => r.id === sub.id)!;
    expect(row.deadline).toBe("expiration");
    expect(row.daysLeft).toBe(7 + 30 - 19);
  });
});

describe("subscriptionsRepo.retryPayment", () => {
  it("refuses every status other than unpaid or suspended and records nothing", () => {
    for (const name of ["Sahel Express", "Dakar Voyages", "Matam Express", "Richard-Toll Bus"]) {
      const sub = subOf(name);
      const before = { attempts: getStore().paymentAttempts.length, invoices: getStore().invoices.length, status: sub.status };
      expect(() => subscriptionsRepo.retryPayment(sub.id))
        .toThrow("Relance impossible : l'abonnement n'est ni impayé ni suspendu");
      expect(getStore().paymentAttempts.length).toBe(before.attempts);
      expect(getStore().invoices.length).toBe(before.invoices);
      expect(sub.status).toBe(before.status);
    }
  });

  it("on success records a paid attempt and a paid invoice, reactivates and pushes the due date by a month", () => {
    const sub = subOf("Baobab Lines");
    expect(sub.nextBillingDate).toBe("2026-11-10T08:00:00.000Z");
    const at = new Date("2026-11-02T09:00:00.000Z");
    const attempt = subscriptionsRepo.retryPayment(sub.id, "tester@sira.app", at);
    expect(attempt).toMatchObject({ status: "paid", reason: null, amount: 25000, at: at.toISOString() });
    const invoice = getStore().invoices.find((i) => i.id === attempt.invoiceId)!;
    expect(invoice).toMatchObject({
      status: "paid", subscriptionId: sub.id, companyId: sub.companyId, amount: 25000,
      number: "INV-2026-0032", issuedAt: at.toISOString(),
    });
    expect(sub.status).toBe("active");
    expect(sub.pastDueSince).toBeNull();
    expect(sub.nextBillingDate).toBe("2026-12-10T08:00:00.000Z");
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({ companyId: sub.companyId, actor: "tester@sira.app" });
    expect(entry.action).toBe("Relance du paiement de l'abonnement : réussie, abonnement réactivé");
  });

  it("reactivates a suspended subscription on success", () => {
    const sub = subOf("Fatick Lines");
    expect(subscriptionsRepo.retryPayment(sub.id).status).toBe("paid");
    expect(sub.status).toBe("active");
  });

  it("on failure records a failed attempt with a reason and changes nothing else", () => {
    const sub = subOf("Saint-Louis Route");
    const since = sub.pastDueSince;
    const invoices = getStore().invoices.length;
    const attempt = subscriptionsRepo.retryPayment(sub.id);
    expect(attempt).toMatchObject({ status: "failed", invoiceId: null, reason: RETRY_FAILURE_REASON });
    expect(attemptsOf(sub.id)).toContainEqual(attempt);
    expect(getStore().invoices.length).toBe(invoices);
    expect(sub.status).toBe("past_due");
    expect(sub.pastDueSince).toBe(since);
    expect(getStore().activity[0]!.action).toBe("Relance du paiement de l'abonnement : échec");
  });

  it("keeps invoice numbers unique across several successful retries", () => {
    subscriptionsRepo.retryPayment(subOf("Baobab Lines").id);
    subscriptionsRepo.retryPayment(subOf("Fatick Lines").id);
    const numbers = getStore().invoices.map((i) => i.number);
    expect(new Set(numbers).size).toBe(numbers.length);
  });

  it("throws for an unknown subscription", () => {
    expect(() => subscriptionsRepo.retryPayment("nope")).toThrow("Abonnement introuvable");
  });
});

describe("subscriptionsRepo.cancel", () => {
  it("refuses a canceled or expired subscription and changes nothing", () => {
    for (const name of ["Richard-Toll Bus", "Matam Express"]) {
      const sub = subOf(name);
      const before = { status: sub.status, history: getStore().subscriptionHistory.length };
      expect(() => subscriptionsRepo.cancel(sub.id, "motif")).toThrow("L'abonnement est déjà annulé ou expiré");
      expect(sub.status).toBe(before.status);
      expect(getStore().subscriptionHistory.length).toBe(before.history);
    }
  });

  it("requires a reason", () => {
    const sub = subOf("Touba Liaison");
    expect(() => subscriptionsRepo.cancel(sub.id, "   ")).toThrow("Un motif est obligatoire");
    expect(sub.status).toBe("active");
  });

  it("cancels, adds a CANCELLATION history entry and logs the reason in the company activity", () => {
    const sub = subOf("Touba Liaison");
    const at = new Date("2026-11-03T10:00:00.000Z");
    subscriptionsRepo.cancel(sub.id, "  Fin de contrat  ", "tester@sira.app", at);
    expect(sub.status).toBe("canceled");
    const last = getStore().subscriptionHistory.at(-1)!;
    expect(last).toMatchObject({
      subscriptionId: sub.id, kind: "CANCELLATION", fromPlan: "Pro", toPlan: null, at: at.toISOString(),
    });
    expect(getStore().activity[0]).toMatchObject({
      companyId: sub.companyId, actor: "tester@sira.app", action: "Abonnement annulé. Motif : Fin de contrat",
    });
  });

  it("takes a canceled unpaid subscription out of the unpaid queue", () => {
    const sub = subOf("Baobab Lines");
    subscriptionsRepo.cancel(sub.id, "Compagnie fermée");
    expect(sub.pastDueSince).toBeNull();
    expect(subscriptionsRepo.unpaidQueue(NOW).map((r) => r.id)).not.toContain(sub.id);
  });
});

describe("invoicesRepo", () => {
  const ALLOWED = ["amount", "companyId", "companyName", "currency", "id", "issuedAt", "number", "status", "subscriptionId"];

  it("lists invoices newest first, filters by status and projects exactly the allowed keys", () => {
    const all = invoicesRepo.listRows();
    expect(all).toHaveLength(30);
    expect(all.map((i) => i.issuedAt)).toEqual([...all.map((i) => i.issuedAt)].sort().reverse());
    for (const r of all) expect(Object.keys(r).sort()).toEqual(ALLOWED);
    expect(invoicesRepo.list({ status: "failed" })).toHaveLength(2);
  });

  it("detail links the subscription and the payment attempt", () => {
    const inv = invoicesRepo.list().find((i) => i.number === "INV-2026-0003")!;
    const d = invoicesRepo.detail(inv.id)!;
    expect(d.companyName).toBe("Sahel Express");
    expect(d.subscription?.id).toBe(inv.subscriptionId);
    expect(d.payment).toMatchObject({ invoiceId: inv.id, status: "paid", invoiceNumber: "INV-2026-0003" });
    expect(invoicesRepo.detail("nope")).toBeUndefined();
  });
});

describe("paymentsRepo", () => {
  const ALLOWED = ["amount", "at", "companyId", "companyName", "currency", "id", "invoiceId", "invoiceNumber", "reason", "status", "subscriptionId"];

  it("lists attempts newest first, filters by status and projects exactly the allowed keys", () => {
    const all = paymentsRepo.listRows();
    expect(all).toHaveLength(34);
    expect(all.map((p) => p.at)).toEqual([...all.map((p) => p.at)].sort().reverse());
    for (const r of all) expect(Object.keys(r).sort()).toEqual(ALLOWED);
    const failed = paymentsRepo.listRows({ status: "failed" });
    expect(failed).toHaveLength(6);
    expect(failed.filter((p) => p.invoiceId === null).every((p) => p.invoiceNumber === null)).toBe(true);
  });
});
