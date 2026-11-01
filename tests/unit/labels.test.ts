import { describe, expect, it } from "vitest";
import {
  billingCycleLabel, changeKindLabel, featureKindLabel, kycTypeStatusBadge, paymentStatusBadge,
  planStatusBadge,
} from "@/lib/labels";

describe("billing labels", () => {
  it("labels plan and KYC type states", () => {
    expect(planStatusBadge("active")).toEqual({ label: "Actif", tone: "success" });
    expect(planStatusBadge("inactive")).toEqual({ label: "Inactif", tone: "neutral" });
    expect(kycTypeStatusBadge(true)).toEqual({ label: "Actif", tone: "success" });
    expect(kycTypeStatusBadge(false)).toEqual({ label: "Inactif", tone: "neutral" });
  });

  it("labels payment attempts", () => {
    expect(paymentStatusBadge("paid")).toEqual({ label: "Payé", tone: "success" });
    expect(paymentStatusBadge("failed")).toEqual({ label: "Échoué", tone: "danger" });
  });

  it("labels plan changes, feature kinds and billing cycles in French", () => {
    expect(["ACTIVATION", "UPGRADE", "DOWNGRADE", "PLAN_CHANGE", "CANCELLATION"].map((k) =>
      changeKindLabel(k as Parameters<typeof changeKindLabel>[0]))).toEqual([
      "Activation", "Montée en gamme", "Descente en gamme", "Changement de plan", "Annulation",
    ]);
    expect(featureKindLabel("boolean")).toBe("Activable");
    expect(featureKindLabel("quota")).toBe("Quota");
    expect(billingCycleLabel("MONTHLY")).toBe("Mensuel");
    expect(billingCycleLabel("YEARLY")).toBe("Annuel");
  });
});
