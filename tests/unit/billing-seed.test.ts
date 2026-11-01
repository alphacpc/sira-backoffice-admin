import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { SubscriptionStatus } from "@/lib/types";
import { KYC_TYPES } from "@/lib/types/kyc";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const subOf = (companyName: string) => {
  const s = getStore();
  const c = s.companies.find((x) => x.name === companyName)!;
  return s.subscriptions.find((x) => x.companyId === c.id)!;
};

describe("billing seed", () => {
  it("has four plans priced in XOF, Legacy being the only inactive one", () => {
    const plans = getStore().plans;
    expect(plans.map((p) => p.name)).toEqual(["Starter", "Pro", "Enterprise", "Legacy"]);
    expect(plans.filter((p) => p.status === "inactive").map((p) => p.code)).toEqual(["LEGACY"]);
    expect(plans.every((p) => p.currency === "XOF")).toBe(true);
  });

  it("has six features, the three partner tiers and the six KYC types active and required", () => {
    const s = getStore();
    expect(s.featureDefs).toHaveLength(6);
    expect(s.partnerTiers.map((t) => [t.code, t.minMonths, t.discountPercent])).toEqual([
      ["STANDARD", 0, 0], ["SILVER", 6, 5], ["GOLD", 12, 10],
    ]);
    expect(s.kycTypes.map((t) => t.code)).toEqual(KYC_TYPES.map((t) => t.code));
    expect(s.kycTypes.every((t) => t.required && t.active)).toBe(true);
  });

  it("only references catalogued features in plans", () => {
    const s = getStore();
    const codes = s.featureDefs.map((f) => f.code);
    for (const p of s.plans) for (const code of p.featureCodes) expect(codes).toContain(code);
  });

  it("points every subscription to a plan with the same name", () => {
    const s = getStore();
    expect(s.subscriptions).toHaveLength(15);
    for (const sub of s.subscriptions) {
      expect(s.plans.find((p) => p.id === sub.planId)?.name).toBe(sub.planName);
    }
  });

  it("has two unpaid, one suspended, one expired, one canceled and two trial subscriptions", () => {
    const count = (st: SubscriptionStatus) => getStore().subscriptions.filter((x) => x.status === st).length;
    expect([count("past_due"), count("suspended"), count("expired"), count("canceled"), count("trial")])
      .toEqual([2, 1, 1, 1, 2]);
  });

  it("sets trialEndDate only on trials and pastDueSince only on unpaid or suspended ones", () => {
    for (const sub of getStore().subscriptions) {
      expect(sub.trialEndDate !== null).toBe(sub.status === "trial");
      expect(sub.pastDueSince !== null).toBe(sub.status === "past_due" || sub.status === "suspended");
    }
  });

  it("links every invoice to a subscription of the same company and to exactly one matching attempt", () => {
    const s = getStore();
    expect(s.invoices).toHaveLength(26);
    for (const inv of s.invoices) {
      expect(s.subscriptions.find((x) => x.id === inv.subscriptionId)?.companyId).toBe(inv.companyId);
      const attempts = s.paymentAttempts.filter((a) => a.invoiceId === inv.id);
      expect(attempts).toHaveLength(1);
      expect(attempts[0]!.status).toBe(inv.status);
      expect(attempts[0]!.amount).toBe(inv.amount);
    }
  });

  it("records failed attempts without invoice for every unpaid or suspended subscription", () => {
    const s = getStore();
    expect(s.paymentAttempts).toHaveLength(30);
    for (const sub of s.subscriptions.filter((x) => x.status === "past_due" || x.status === "suspended")) {
      expect(s.paymentAttempts.some((a) =>
        a.subscriptionId === sub.id && a.status === "failed" && a.invoiceId === null && !!a.reason,
      )).toBe(true);
    }
  });

  it("starts every history with an activation and ends the canceled one with a cancellation", () => {
    const s = getStore();
    for (const sub of s.subscriptions) {
      const h = s.subscriptionHistory
        .filter((x) => x.subscriptionId === sub.id)
        .sort((a, b) => a.at.localeCompare(b.at));
      expect(h[0]!.kind).toBe("ACTIVATION");
      expect(h[0]!.fromPlan).toBeNull();
      if (sub.status === "canceled") expect(h.at(-1)!.kind).toBe("CANCELLATION");
    }
    expect(s.subscriptionHistory.filter((x) => x.kind === "UPGRADE")).toHaveLength(2);
    expect(s.subscriptionHistory.filter((x) => x.kind === "DOWNGRADE")).toHaveLength(1);
  });

  it("gives each unpaid or suspended subscription a deterministic retry outcome", () => {
    const outcomes = getStore().retryOutcomes;
    expect(outcomes[subOf("Baobab Lines").id]).toBe("success");
    expect(outcomes[subOf("Saint-Louis Route").id]).toBe("failure");
    expect(outcomes[subOf("Fatick Lines").id]).toBe("success");
    expect(Object.keys(outcomes)).toHaveLength(3);
  });
});

describe("billing seed coherence", () => {
  it("gives trial subscriptions no invoice and no attempt, activated trialDays before the trial end", () => {
    const s = getStore();
    for (const sub of s.subscriptions.filter((x) => x.status === "trial")) {
      expect(s.invoices.filter((i) => i.subscriptionId === sub.id)).toHaveLength(0);
      expect(s.paymentAttempts.filter((a) => a.subscriptionId === sub.id)).toHaveLength(0);
      const plan = s.plans.find((p) => p.id === sub.planId)!;
      const activation = s.subscriptionHistory.find((h) => h.subscriptionId === sub.id && h.kind === "ACTIVATION")!;
      expect(new Date(sub.trialEndDate!).getTime() - new Date(activation.at).getTime()).toBe(plan.trialDays * 86400000);
    }
  });

  it("dates the failed invoice of an unpaid subscription on its pastDueSince day", () => {
    const s = getStore();
    for (const sub of s.subscriptions.filter((x) => x.status === "past_due")) {
      const failed = s.invoices.filter((i) => i.subscriptionId === sub.id && i.status === "failed");
      expect(failed).toHaveLength(1);
      expect(failed[0]!.issuedAt).toBe(sub.pastDueSince);
    }
  });
});
