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

import { busStatusBadge } from "@/lib/labels";
describe("bus status badge", () => {
  it("labels the three bus statuses", () => {
    expect(busStatusBadge("active")).toEqual({ label: "En service", tone: "success" });
    expect(busStatusBadge("maintenance")).toEqual({ label: "Maintenance", tone: "warning" });
    expect(busStatusBadge("retired")).toEqual({ label: "Hors service", tone: "neutral" });
  });
});

import {
  busTypeLabel, crewRoleLabel, expiryBadge, fuelTypeLabel, maintenanceCategoryLabel, maintenanceStatusBadge,
  routeStatusBadge, seatStateLabel, tripStatusBadge, vendorKindLabel,
} from "@/lib/labels";
describe("fleet labels", () => {
  it("labels trip, maintenance and route statuses", () => {
    expect(["planned", "boarding", "departed", "cancelled"].map((st) => tripStatusBadge(st as "planned").label))
      .toEqual(["Planifié", "Embarquement", "Parti", "Annulé"]);
    expect(["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"].map((st) => maintenanceStatusBadge(st as "PLANNED")))
      .toEqual([
        { label: "Planifiée", tone: "info" }, { label: "En cours", tone: "warning" },
        { label: "Terminée", tone: "success" }, { label: "Annulée", tone: "neutral" },
      ]);
    expect(routeStatusBadge("inactive")).toEqual({ label: "Inactive", tone: "neutral" });
  });
  it("labels an expiry by state and days", () => {
    expect(expiryBadge("expired", -12)).toEqual({ label: "Expirée depuis 12 j", tone: "danger" });
    expect(expiryBadge("expired", 0)).toEqual({ label: "Expirée aujourd'hui", tone: "danger" });
    expect(expiryBadge("soon", 15)).toEqual({ label: "Expire dans 15 j", tone: "warning" });
    expect(expiryBadge("soon", 0)).toEqual({ label: "Expire aujourd'hui", tone: "warning" });
    expect(expiryBadge("ok", 200)).toEqual({ label: "À jour", tone: "success" });
  });
  it("labels bus types, fuels, vendor kinds, crew roles, categories and seat states in French", () => {
    expect(["MINIBUS", "COACH", "STANDARD", "ARTICULATED"].map((t) => busTypeLabel(t as "COACH")))
      .toEqual(["Minibus", "Autocar", "Bus standard", "Bus articulé"]);
    expect(["DIESEL", "PETROL", "ELECTRIC", "HYBRID"].map((t) => fuelTypeLabel(t as "DIESEL")))
      .toEqual(["Diesel", "Essence", "Électrique", "Hybride"]);
    expect(["GARAGE", "INSURER", "PARTS", "OTHER"].map((k) => vendorKindLabel(k as "GARAGE")))
      .toEqual(["Garage", "Assureur", "Pièces détachées", "Autre"]);
    expect(["DRIVER", "DRIVER_ASSISTANT", "CONTROLLER"].map((r) => crewRoleLabel(r as "DRIVER")))
      .toEqual(["Conducteur principal", "Conducteur assistant", "Contrôleur"]);
    expect(["PREVENTIVE", "CORRECTIVE", "INSPECTION"].map((c) => maintenanceCategoryLabel(c as "PREVENTIVE")))
      .toEqual(["Préventive", "Corrective", "Contrôle"]);
    expect(["free", "booked", "occupied", "blocked"].map((st) => seatStateLabel(st as "free")))
      .toEqual(["libre", "réservé", "occupé", "bloqué"]);
  });
});

import {
  anomalyExplanation, anomalyLabel, bookingPaymentBadge, bookingStatusBadge, cancelReasonLabel,
  channelLabel, paymentKindLabel, ticketStatusBadge, transactionStatusBadge,
} from "@/lib/labels";

describe("sales labels", () => {
  it("labels booking, payment, transaction and ticket statuses", () => {
    expect(bookingStatusBadge("confirmed")).toEqual({ label: "Confirmée", tone: "success" });
    expect(bookingStatusBadge("cancelled")).toEqual({ label: "Annulée", tone: "neutral" });
    expect(bookingPaymentBadge("pending")).toEqual({ label: "En attente", tone: "warning" });
    expect(bookingPaymentBadge("paid")).toEqual({ label: "Payée", tone: "success" });
    expect(bookingPaymentBadge("failed")).toEqual({ label: "Échouée", tone: "danger" });
    expect(transactionStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(transactionStatusBadge("COMPLETED")).toEqual({ label: "Réussie", tone: "success" });
    expect(transactionStatusBadge("FAILED")).toEqual({ label: "Échouée", tone: "danger" });
    expect(ticketStatusBadge("ISSUED")).toEqual({ label: "Émis", tone: "info" });
    expect(ticketStatusBadge("CHECKED_IN")).toEqual({ label: "Enregistré", tone: "success" });
    expect(ticketStatusBadge("USED")).toEqual({ label: "Utilisé", tone: "neutral" });
    expect(ticketStatusBadge("CANCELLED")).toEqual({ label: "Annulé", tone: "danger" });
  });

  it("labels channels, payment kinds, cancellation causes and anomalies", () => {
    expect(channelLabel("online")).toBe("En ligne");
    expect(channelLabel("counter")).toBe("Guichet");
    expect(paymentKindLabel("MOBILE_MONEY")).toBe("Mobile money");
    expect(paymentKindLabel("CARD")).toBe("Carte bancaire");
    expect(paymentKindLabel("CASH")).toBe("Espèces");
    expect(cancelReasonLabel("EXPIRED")).toBe("Expirée (non payée à temps)");
    expect(cancelReasonLabel("CLIENT")).toBe("Annulée par le client");
    expect(cancelReasonLabel("PLATFORM")).toBe("Annulée par l'équipe Sira");
    expect(anomalyLabel("STUCK")).toBe("Paiement bloqué");
    expect(anomalyLabel("AMOUNT_MISMATCH")).toBe("Montant différent");
    expect(anomalyLabel("MISSING_TICKET")).toBe("Billet manquant");
    expect(anomalyExplanation("STUCK")).toBe("Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur.");
    expect(anomalyExplanation("AMOUNT_MISMATCH")).toBe("Le montant de la transaction ne correspond pas à celui de la réservation.");
    expect(anomalyExplanation("MISSING_TICKET")).toBe("Le paiement est réussi mais aucun billet n'a été émis pour cette réservation.");
  });
});
