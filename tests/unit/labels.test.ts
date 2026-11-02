import { describe, expect, it } from "vitest";
import { adminStatusBadge, impactScopeLabel, incidentStatusBadge } from "@/lib/labels";
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

import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";

describe("parcel labels", () => {
  it("labels parcel statuses, payments and types", () => {
    expect(parcelStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "neutral" });
    expect(parcelStatusBadge("IN_TRANSIT")).toEqual({ label: "En transit", tone: "info" });
    expect(parcelStatusBadge("AT_HUB")).toEqual({ label: "Au hub", tone: "warning" });
    expect(parcelStatusBadge("DELIVERED")).toEqual({ label: "Livré", tone: "success" });
    expect(parcelStatusBadge("CANCELLED")).toEqual({ label: "Annulé", tone: "neutral" });
    expect(parcelStatusBadge("RETURNED")).toEqual({ label: "Retourné", tone: "warning" });
    expect(parcelStatusBadge("LOST")).toEqual({ label: "Perdu", tone: "danger" });
    expect(parcelPaymentBadge("PENDING")).toEqual({ label: "À payer", tone: "warning" });
    expect(parcelPaymentBadge("PAID")).toEqual({ label: "Payé", tone: "success" });
    expect(parcelPaymentBadge("REFUNDED")).toEqual({ label: "Remboursé", tone: "neutral" });
    expect(parcelTypeLabel("DOCUMENT")).toBe("Document");
    expect(parcelTypeLabel("PACKAGE")).toBe("Colis standard");
    expect(parcelTypeLabel("FRAGILE")).toBe("Fragile");
    expect(parcelTypeLabel("PERISHABLE")).toBe("Périssable");
    expect(parcelTypeLabel("OTHER")).toBe("Autre");
  });
});

import {
  feedbackStatusBadge, feedbackTypeLabel, membershipLabel, ratingStars, rewardLabel, sponsorshipStatusBadge,
} from "@/lib/labels";

describe("client labels", () => {
  it("labels reviews, memberships, sponsorships and ratings", () => {
    expect(feedbackStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(feedbackStatusBadge("REVIEWED")).toEqual({ label: "Examiné", tone: "info" });
    expect(feedbackStatusBadge("RESOLVED")).toEqual({ label: "Résolu", tone: "success" });
    expect(feedbackStatusBadge("IGNORED")).toEqual({ label: "Ignoré", tone: "neutral" });
    expect(feedbackTypeLabel("TRIP")).toBe("Trajet");
    expect(feedbackTypeLabel("BUS")).toBe("Bus");
    expect(feedbackTypeLabel("STATION")).toBe("Gare");
    expect(feedbackTypeLabel("SERVICE")).toBe("Service");
    expect(feedbackTypeLabel("PARCEL")).toBe("Colis");
    expect(membershipLabel("REGULAR")).toBe("Standard");
    expect(membershipLabel("VIP")).toBe("VIP");
    expect(membershipLabel("PREMIUM")).toBe("Premium");
    expect(sponsorshipStatusBadge("ACTIVE")).toEqual({ label: "Actif", tone: "success" });
    expect(sponsorshipStatusBadge("REDEEMED")).toEqual({ label: "Utilisé", tone: "info" });
    expect(sponsorshipStatusBadge("EXPIRED")).toEqual({ label: "Expiré", tone: "neutral" });
    expect(rewardLabel("DISCOUNT", 10, "XOF")).toBe("Réduction de 10 %");
    expect(rewardLabel("LOYALTY_POINTS", 500, "XOF")).toBe("500 points");
    expect(rewardLabel("CASH", 2000, "XOF")).toMatch(/^Remise de 2[\s  ]000/);
    expect(ratingStars(3)).toBe("★★★☆☆");
    expect(ratingStars(5)).toBe("★★★★★");
  });
});

import {
  campaignStatusBadge, messageStatusBadge, notificationChannelLabel, notificationStatusBadge, notificationTypeLabel,
  objectiveLabel, scheduleStatusBadge,
} from "@/lib/labels";

describe("communication labels", () => {
  it("labels notification statuses, channels and types", () => {
    expect(notificationStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(notificationStatusBadge("SENT")).toEqual({ label: "Envoyée", tone: "success" });
    expect(notificationStatusBadge("FAILED")).toEqual({ label: "Échouée", tone: "danger" });
    expect(notificationChannelLabel("EMAIL")).toBe("E-mail");
    expect(notificationChannelLabel("SMS")).toBe("SMS");
    expect(notificationChannelLabel("IN_APP")).toBe("Dans l'application");
    expect(notificationChannelLabel("PUSH")).toBe("Notification push");
    expect(notificationChannelLabel("WHATSAPP")).toBe("WhatsApp");
    expect(notificationTypeLabel("booking_confirmed")).toBe("Réservation confirmée");
    expect(notificationTypeLabel("booking_cancelled")).toBe("Réservation annulée");
    expect(notificationTypeLabel("payment_completed")).toBe("Paiement confirmé");
    expect(notificationTypeLabel("parcel_created")).toBe("Colis enregistré");
    expect(notificationTypeLabel("parcel_status_in_transit")).toBe("Colis : en transit");
    expect(notificationTypeLabel("parcel_status_at_hub")).toBe("Colis : au hub");
    expect(notificationTypeLabel("feedback_response")).toBe("Réponse à un avis");
    expect(notificationTypeLabel("marketing_message")).toBe("Message marketing");
    expect(notificationTypeLabel("inconnu_type")).toBe("inconnu_type");
  });

  it("labels campaigns, objectives, messages and schedules", () => {
    expect(campaignStatusBadge("DRAFT")).toEqual({ label: "Brouillon", tone: "neutral" });
    expect(campaignStatusBadge("SCHEDULED")).toEqual({ label: "Programmée", tone: "info" });
    expect(campaignStatusBadge("RUNNING")).toEqual({ label: "En cours", tone: "info" });
    expect(campaignStatusBadge("COMPLETED")).toEqual({ label: "Terminée", tone: "success" });
    expect(campaignStatusBadge("CANCELLED")).toEqual({ label: "Annulée", tone: "neutral" });
    expect(objectiveLabel("ACQUISITION")).toBe("Acquisition");
    expect(objectiveLabel("RETENTION")).toBe("Fidélisation");
    expect(objectiveLabel("PROMOTION")).toBe("Promotion");
    expect(objectiveLabel("REACTIVATION")).toBe("Réactivation");
    expect(messageStatusBadge("DRAFT")).toEqual({ label: "Brouillon", tone: "neutral" });
    expect(messageStatusBadge("APPROVED")).toEqual({ label: "Approuvé", tone: "success" });
    expect(messageStatusBadge("SENT")).toEqual({ label: "Envoyé", tone: "info" });
    expect(scheduleStatusBadge("PENDING")).toEqual({ label: "En attente", tone: "warning" });
    expect(scheduleStatusBadge("SENT")).toEqual({ label: "Envoyée", tone: "success" });
    expect(scheduleStatusBadge("FAILED")).toEqual({ label: "Échouée", tone: "danger" });
    expect(scheduleStatusBadge("CANCELLED")).toEqual({ label: "Annulée", tone: "neutral" });
  });
});

import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";

describe("data-subject request labels", () => {
  it("labels types and statuses", () => {
    expect(dsrTypeLabel("ACCESS")).toBe("Accès");
    expect(dsrTypeLabel("RECTIFICATION")).toBe("Rectification");
    expect(dsrTypeLabel("ERASURE")).toBe("Effacement");
    expect(dsrTypeLabel("PORTABILITY")).toBe("Portabilité");
    expect(dsrTypeLabel("RESTRICTION")).toBe("Limitation");
    expect(dsrTypeLabel("OBJECTION")).toBe("Opposition");
    expect(dsrStatusBadge("RECEIVED")).toEqual({ label: "Reçue", tone: "warning" });
    expect(dsrStatusBadge("IN_PROGRESS")).toEqual({ label: "En cours", tone: "info" });
    expect(dsrStatusBadge("COMPLETED")).toEqual({ label: "Clôturée", tone: "success" });
    expect(dsrStatusBadge("REJECTED")).toEqual({ label: "Rejetée", tone: "neutral" });
  });
});

import {
  accessReasonLabel, accessTypeLabel, auditActionLabel, auditActorTypeLabel, consentSourceLabel, consentStatusBadge,
  consentTypeLabel, dataCategoryLabel,
} from "@/lib/labels";

describe("compliance labels", () => {
  it("labels audit actions and actor types", () => {
    expect(auditActionLabel("CREATE")).toBe("Création");
    expect(auditActionLabel("UPDATE")).toBe("Modification");
    expect(auditActionLabel("DELETE")).toBe("Suppression");
    expect(auditActionLabel("LOGIN")).toBe("Connexion");
    expect(auditActionLabel("LOGIN_FAILED")).toBe("Échec de connexion");
    expect(auditActionLabel("EXPORT")).toBe("Export");
    expect(auditActionLabel("PERMISSION_CHANGE")).toBe("Changement de permission");
    expect(auditActorTypeLabel("USER")).toBe("Utilisateur");
    expect(auditActorTypeLabel("EMPLOYEE")).toBe("Employé");
    expect(auditActorTypeLabel("SYSTEM")).toBe("Système");
    expect(auditActorTypeLabel("API_KEY")).toBe("Clé d'API");
  });

  it("labels data accesses", () => {
    expect(accessTypeLabel("VIEW")).toBe("Consultation");
    expect(accessTypeLabel("EXPORT")).toBe("Export");
    expect(accessTypeLabel("MODIFY")).toBe("Modification");
    expect(accessTypeLabel("DELETE")).toBe("Suppression");
    expect(dataCategoryLabel("IDENTITY")).toBe("Identité");
    expect(dataCategoryLabel("FINANCIAL")).toBe("Finances");
    expect(dataCategoryLabel("LOCATION")).toBe("Localisation");
    expect(dataCategoryLabel("HEALTH")).toBe("Santé");
    expect(dataCategoryLabel("CONTACT")).toBe("Contact");
    expect(dataCategoryLabel("CONSENT")).toBe("Consentement");
    expect(accessReasonLabel("SUPPORT_REQUEST")).toBe("Demande d'assistance");
    expect(accessReasonLabel("LEGAL_OBLIGATION")).toBe("Obligation légale");
    expect(accessReasonLabel("SERVICE_DELIVERY")).toBe("Prestation du service");
    expect(accessReasonLabel("INVESTIGATION")).toBe("Enquête");
  });

  it("labels consents", () => {
    expect(consentTypeLabel("MARKETING_EMAIL")).toBe("Marketing par e-mail");
    expect(consentTypeLabel("MARKETING_SMS")).toBe("Marketing par SMS");
    expect(consentTypeLabel("DATA_SHARING_PARTNERS")).toBe("Partage avec des partenaires");
    expect(consentTypeLabel("COOKIES_ANALYTICS")).toBe("Cookies et analyses");
    expect(consentTypeLabel("GEOLOCATION")).toBe("Géolocalisation");
    expect(consentStatusBadge("GRANTED")).toEqual({ label: "Accordé", tone: "success" });
    expect(consentStatusBadge("WITHDRAWN")).toEqual({ label: "Retiré", tone: "neutral" });
    expect(consentSourceLabel("SIGNUP")).toBe("Inscription");
    expect(consentSourceLabel("SETTINGS_PAGE")).toBe("Page de réglages");
    expect(consentSourceLabel("BOOKING_FLOW")).toBe("Parcours de réservation");
  });
});

describe("monitoring labels", () => {
  it("labels incident statuses and impact scopes", () => {
    expect(incidentStatusBadge("INVESTIGATING")).toEqual({ label: "En investigation", tone: "warning" });
    expect(incidentStatusBadge("IDENTIFIED")).toEqual({ label: "Identifié", tone: "warning" });
    expect(incidentStatusBadge("MONITORING")).toEqual({ label: "Sous surveillance", tone: "info" });
    expect(incidentStatusBadge("RESOLVED")).toEqual({ label: "Résolu", tone: "success" });
    expect(impactScopeLabel("SINGLE_COMPANY")).toBe("Une compagnie");
    expect(impactScopeLabel("MULTI_COMPANY")).toBe("Plusieurs compagnies");
    expect(impactScopeLabel("PLATFORM_WIDE")).toBe("Toute la plateforme");
  });
});

describe("admin status badge", () => {
  it("labels the three administrator statuses", () => {
    expect(adminStatusBadge("active")).toEqual({ label: "Actif", tone: "success" });
    expect(adminStatusBadge("suspended")).toEqual({ label: "Suspendu", tone: "danger" });
    expect(adminStatusBadge("invited")).toEqual({ label: "Invité", tone: "info" });
  });
});
