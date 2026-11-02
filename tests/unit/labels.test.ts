import { describe, expect, it } from "vitest";
import {
  billingCycleLabel, changeKindLabel, featureKindLabel, kycTypeStatusBadge, paymentStatusBadge,
  planStatusBadge, urgencyBadge,
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

describe("urgencyBadge", () => {
  it("is neutral when the deadline is more than five days away", () => {
    expect(urgencyBadge("expiration", 17)).toEqual({ label: "17 j avant expiration", tone: "neutral" });
  });
  it("warns between three and five days and alarms at two days or less", () => {
    expect(urgencyBadge("suspension", 5)).toEqual({ label: "5 j avant suspension", tone: "warning" });
    expect(urgencyBadge("suspension", 2)).toEqual({ label: "2 j avant suspension", tone: "danger" });
  });
  it("has exact tone boundaries", () => {
    const t = (d: number) => urgencyBadge("suspension", d);
    expect(t(6)).toEqual({ label: "6 j avant suspension", tone: "neutral" });
    expect(t(5).tone).toBe("warning");
    expect(t(3)).toEqual({ label: "3 j avant suspension", tone: "warning" });
    expect(t(2).tone).toBe("danger");
    expect(t(1)).toEqual({ label: "1 j avant suspension", tone: "danger" });
    expect(t(0)).toEqual({ label: "Suspension aujourd'hui", tone: "danger" });
    expect(t(-1)).toEqual({ label: "Suspension dépassée de 1 j", tone: "danger" });
  });
  it("says today on the deadline day", () => {
    expect(urgencyBadge("suspension", 0)).toEqual({ label: "Suspension aujourd'hui", tone: "danger" });
  });
  it("reports an overdue deadline", () => {
    expect(urgencyBadge("expiration", -3)).toEqual({ label: "Expiration dépassée de 3 j", tone: "danger" });
  });
});

import { permissionDomainLabel, sessionStateBadge, userStatusBadge } from "@/lib/labels";
describe("access labels", () => {
  it("labels account statuses and session states", () => {
    expect(userStatusBadge("active")).toEqual({ label: "Actif", tone: "success" });
    expect(userStatusBadge("suspended")).toEqual({ label: "Suspendu", tone: "warning" });
    expect(["active", "revoked", "expired"].map((st) => sessionStateBadge(st as "active").label))
      .toEqual(["Active", "Révoquée", "Expirée"]);
  });
  it("labels the eleven permission domains in French", () => {
    expect(["companies", "fleet", "bookings", "parcels", "hr", "customers", "marketing", "notifications",
      "compliance", "monitoring", "platform"].map((d) => permissionDomainLabel(d as "fleet"))).toEqual([
      "Compagnies", "Flotte", "Réservations", "Colis", "Ressources humaines", "Clients", "Marketing",
      "Notifications", "Conformité", "Supervision", "Plateforme",
    ]);
  });
});
