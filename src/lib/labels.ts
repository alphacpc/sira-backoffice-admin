import { formatMoney } from "@/lib/format";
import type { Tone } from "@/components/data/status-badge";
import type {
  AnomalyKind, BookingChannel, BookingPaymentStatus, BookingStatus, CancelReason, PaymentMethodKind, TicketStatus,
  TransactionStatus,
  BusStatus, BusType, CompanyStatus, CrewRole, FeatureDef, FuelType, Incident, Invoice, KycDocumentStatus,
  MaintenanceCategory, MaintenanceStatus, PaymentAttempt, PermissionDomain, Plan, RouteStatus, SeatState,
  FeedbackStatus, FeedbackType, MembershipType, SponsorshipRewardType, SponsorshipStatus,
  ParcelPaymentStatus, ParcelStatus, ParcelType, ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, TripStatus, UserStatus, VendorKind,
} from "@/lib/types";

type Badge = { label: string; tone: Tone };

const pick = <K extends string>(map: Record<K, Badge>, key: K): Badge => map[key];

export const companyStatusBadge = (s: CompanyStatus): Badge =>
  pick({
    draft: { label: "Brouillon", tone: "neutral" },
    active: { label: "Active", tone: "success" },
    suspended: { label: "Suspendue", tone: "warning" },
    closed: { label: "Fermée", tone: "danger" },
  }, s);

export const subscriptionStatusBadge = (s: SubscriptionStatus): Badge =>
  pick({
    trial: { label: "Essai", tone: "info" },
    active: { label: "Active", tone: "success" },
    past_due: { label: "Impayée", tone: "danger" },
    suspended: { label: "Suspendue", tone: "warning" },
    expired: { label: "Expirée", tone: "neutral" },
    canceled: { label: "Annulée", tone: "neutral" },
  }, s);

export const kycStatusBadge = (s: KycDocumentStatus): Badge =>
  pick({
    pending: { label: "En attente", tone: "warning" },
    approved: { label: "Approuvé", tone: "success" },
    rejected: { label: "Rejeté", tone: "danger" },
  }, s);

export const serviceStatusBadge = (s: ServiceHealth["status"]): Badge =>
  pick({
    healthy: { label: "Opérationnel", tone: "success" },
    degraded: { label: "Dégradé", tone: "warning" },
    down: { label: "En panne", tone: "danger" },
  }, s);

export const severityBadge = (s: Incident["severity"]): Badge =>
  pick({
    LOW: { label: "Faible", tone: "neutral" },
    MEDIUM: { label: "Moyenne", tone: "warning" },
    HIGH: { label: "Haute", tone: "danger" },
    CRITICAL: { label: "Critique", tone: "danger" },
  }, s);

export const invoiceStatusBadge = (s: Invoice["status"]): Badge =>
  pick({
    paid: { label: "Payée", tone: "success" },
    failed: { label: "Échouée", tone: "danger" },
  }, s);

export const planStatusBadge = (s: Plan["status"]): Badge =>
  pick({
    active: { label: "Actif", tone: "success" },
    inactive: { label: "Inactif", tone: "neutral" },
  }, s);

export const kycTypeStatusBadge = (active: boolean): Badge =>
  active ? { label: "Actif", tone: "success" } : { label: "Inactif", tone: "neutral" };

export const paymentStatusBadge = (s: PaymentAttempt["status"]): Badge =>
  pick({
    paid: { label: "Payé", tone: "success" },
    failed: { label: "Échoué", tone: "danger" },
  }, s);

const CHANGE_KIND_LABELS: Record<SubscriptionChangeKind, string> = {
  ACTIVATION: "Activation",
  UPGRADE: "Montée en gamme",
  DOWNGRADE: "Descente en gamme",
  PLAN_CHANGE: "Changement de plan",
  CANCELLATION: "Annulation",
};

export const changeKindLabel = (k: SubscriptionChangeKind): string => CHANGE_KIND_LABELS[k];

export const featureKindLabel = (k: FeatureDef["kind"]): string => (k === "boolean" ? "Activable" : "Quota");

export const billingCycleLabel = (c: Subscription["billingCycle"]): string =>
  c === "MONTHLY" ? "Mensuel" : "Annuel";

/** Urgency of an unpaid subscription; daysLeft comes from subscriptionsRepo.unpaidQueue(now). */
export function urgencyBadge(deadline: "suspension" | "expiration", daysLeft: number): Badge {
  const noun = deadline === "suspension" ? "Suspension" : "Expiration";
  if (daysLeft < 0) return { label: `${noun} dépassée de ${-daysLeft} j`, tone: "danger" };
  if (daysLeft === 0) return { label: `${noun} aujourd'hui`, tone: "danger" };
  const label = `${daysLeft} j avant ${deadline}`;
  if (daysLeft <= 2) return { label, tone: "danger" };
  if (daysLeft <= 5) return { label, tone: "warning" };
  return { label, tone: "neutral" };
}


export const userStatusBadge = (s: UserStatus): Badge =>
  pick({
    active: { label: "Actif", tone: "success" },
    suspended: { label: "Suspendu", tone: "warning" },
  }, s);

export const sessionStateBadge = (s: "active" | "revoked" | "expired"): Badge =>
  pick({
    active: { label: "Active", tone: "success" },
    revoked: { label: "Révoquée", tone: "neutral" },
    expired: { label: "Expirée", tone: "neutral" },
  }, s);

const DOMAIN_LABELS: Record<PermissionDomain, string> = {
  companies: "Compagnies",
  fleet: "Flotte",
  bookings: "Réservations",
  parcels: "Colis",
  hr: "Ressources humaines",
  customers: "Clients",
  marketing: "Marketing",
  notifications: "Notifications",
  compliance: "Conformité",
  monitoring: "Supervision",
  platform: "Plateforme",
};

export const permissionDomainLabel = (d: PermissionDomain): string => DOMAIN_LABELS[d];

export const busStatusBadge = (s: BusStatus): Badge =>
  pick({
    active: { label: "En service", tone: "success" },
    maintenance: { label: "Maintenance", tone: "warning" },
    retired: { label: "Hors service", tone: "neutral" },
  }, s);

export const tripStatusBadge = (s: TripStatus): Badge =>
  pick({
    planned: { label: "Planifié", tone: "info" },
    boarding: { label: "Embarquement", tone: "warning" },
    departed: { label: "Parti", tone: "success" },
    cancelled: { label: "Annulé", tone: "neutral" },
  }, s);

export const maintenanceStatusBadge = (s: MaintenanceStatus): Badge =>
  pick({
    PLANNED: { label: "Planifiée", tone: "info" },
    IN_PROGRESS: { label: "En cours", tone: "warning" },
    COMPLETED: { label: "Terminée", tone: "success" },
    CANCELLED: { label: "Annulée", tone: "neutral" },
  }, s);

export const routeStatusBadge = (s: RouteStatus): Badge =>
  pick({
    active: { label: "Active", tone: "success" },
    inactive: { label: "Inactive", tone: "neutral" },
  }, s);

/** Expiry of a bus document; `daysLeft` comes from `daysUntil` (fleet repository). */
export function expiryBadge(state: "expired" | "soon" | "ok", daysLeft: number): Badge {
  if (state === "expired") {
    return { label: daysLeft === 0 ? "Expirée aujourd'hui" : `Expirée depuis ${-daysLeft} j`, tone: "danger" };
  }
  if (state === "soon") return { label: daysLeft === 0 ? "Expire aujourd'hui" : `Expire dans ${daysLeft} j`, tone: "warning" };
  return { label: "À jour", tone: "success" };
}

const BUS_TYPE_LABELS: Record<BusType, string> = {
  MINIBUS: "Minibus", COACH: "Autocar", STANDARD: "Bus standard", ARTICULATED: "Bus articulé",
};
export const busTypeLabel = (t: BusType): string => BUS_TYPE_LABELS[t];

const FUEL_LABELS: Record<FuelType, string> = { DIESEL: "Diesel", PETROL: "Essence", ELECTRIC: "Électrique", HYBRID: "Hybride" };
export const fuelTypeLabel = (t: FuelType): string => FUEL_LABELS[t];

const VENDOR_KIND_LABELS: Record<VendorKind, string> = {
  GARAGE: "Garage", INSURER: "Assureur", PARTS: "Pièces détachées", OTHER: "Autre",
};
export const vendorKindLabel = (k: VendorKind): string => VENDOR_KIND_LABELS[k];

const CREW_ROLE_LABELS: Record<CrewRole, string> = {
  DRIVER: "Conducteur principal", DRIVER_ASSISTANT: "Conducteur assistant", CONTROLLER: "Contrôleur",
};
export const crewRoleLabel = (r: CrewRole): string => CREW_ROLE_LABELS[r];

const CATEGORY_LABELS: Record<MaintenanceCategory, string> = {
  PREVENTIVE: "Préventive", CORRECTIVE: "Corrective", INSPECTION: "Contrôle",
};
export const maintenanceCategoryLabel = (c: MaintenanceCategory): string => CATEGORY_LABELS[c];

const SEAT_STATE_LABELS: Record<SeatState, string> = { free: "libre", booked: "réservé", occupied: "occupé", blocked: "bloqué" };
/** Lower-case state of a seat, as read in "Siège 3B, réservé". */
export const seatStateLabel = (s: SeatState): string => SEAT_STATE_LABELS[s];

export const bookingStatusBadge = (s: BookingStatus): Badge =>
  pick({
    confirmed: { label: "Confirmée", tone: "success" },
    cancelled: { label: "Annulée", tone: "neutral" },
  }, s);

export const bookingPaymentBadge = (s: BookingPaymentStatus): Badge =>
  pick({
    pending: { label: "En attente", tone: "warning" },
    paid: { label: "Payée", tone: "success" },
    failed: { label: "Échouée", tone: "danger" },
  }, s);

export const transactionStatusBadge = (s: TransactionStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "warning" },
    COMPLETED: { label: "Réussie", tone: "success" },
    FAILED: { label: "Échouée", tone: "danger" },
  }, s);

export const ticketStatusBadge = (s: TicketStatus): Badge =>
  pick({
    ISSUED: { label: "Émis", tone: "info" },
    CHECKED_IN: { label: "Enregistré", tone: "success" },
    USED: { label: "Utilisé", tone: "neutral" },
    CANCELLED: { label: "Annulé", tone: "danger" },
  }, s);

export const channelLabel = (c: BookingChannel): string => (c === "online" ? "En ligne" : "Guichet");

export const paymentKindLabel = (k: PaymentMethodKind): string =>
  ({ MOBILE_MONEY: "Mobile money", CARD: "Carte bancaire", CASH: "Espèces" })[k];

export const cancelReasonLabel = (r: CancelReason): string =>
  ({
    EXPIRED: "Expirée (non payée à temps)",
    CLIENT: "Annulée par le client",
    PLATFORM: "Annulée par l'équipe Sira",
  })[r];

export const anomalyLabel = (k: AnomalyKind): string =>
  ({ STUCK: "Paiement bloqué", AMOUNT_MISMATCH: "Montant différent", MISSING_TICKET: "Billet manquant" })[k];

export const anomalyExplanation = (k: AnomalyKind): string =>
  ({
    STUCK: "Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur.",
    AMOUNT_MISMATCH: "Le montant de la transaction ne correspond pas à celui de la réservation.",
    MISSING_TICKET: "Le paiement est réussi mais aucun billet n'a été émis pour cette réservation.",
  })[k];

export const parcelStatusBadge = (s: ParcelStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "neutral" },
    IN_TRANSIT: { label: "En transit", tone: "info" },
    AT_HUB: { label: "Au hub", tone: "warning" },
    DELIVERED: { label: "Livré", tone: "success" },
    CANCELLED: { label: "Annulé", tone: "neutral" },
    RETURNED: { label: "Retourné", tone: "warning" },
    LOST: { label: "Perdu", tone: "danger" },
  }, s);

export const parcelPaymentBadge = (s: ParcelPaymentStatus): Badge =>
  pick({
    PENDING: { label: "À payer", tone: "warning" },
    PAID: { label: "Payé", tone: "success" },
    REFUNDED: { label: "Remboursé", tone: "neutral" },
  }, s);

export const parcelTypeLabel = (t: ParcelType): string =>
  ({ DOCUMENT: "Document", PACKAGE: "Colis standard", FRAGILE: "Fragile", PERISHABLE: "Périssable", OTHER: "Autre" })[t];

export const feedbackStatusBadge = (s: FeedbackStatus): Badge =>
  pick({
    PENDING: { label: "En attente", tone: "warning" },
    REVIEWED: { label: "Examiné", tone: "info" },
    RESOLVED: { label: "Résolu", tone: "success" },
    IGNORED: { label: "Ignoré", tone: "neutral" },
  }, s);

export const feedbackTypeLabel = (t: FeedbackType): string =>
  ({ TRIP: "Trajet", BUS: "Bus", STATION: "Gare", SERVICE: "Service", PARCEL: "Colis" })[t];

export const membershipLabel = (m: MembershipType): string =>
  ({ REGULAR: "Standard", VIP: "VIP", PREMIUM: "Premium" })[m];

export const sponsorshipStatusBadge = (s: SponsorshipStatus): Badge =>
  pick({
    ACTIVE: { label: "Actif", tone: "success" },
    REDEEMED: { label: "Utilisé", tone: "info" },
    EXPIRED: { label: "Expiré", tone: "neutral" },
  }, s);

export const rewardLabel = (type: SponsorshipRewardType, value: number, currency: string): string =>
  type === "DISCOUNT" ? `Réduction de ${value} %`
    : type === "LOYALTY_POINTS" ? `${value} points`
    : `Remise de ${formatMoney(value, currency)}`;

export const ratingStars = (rating: number): string => "★".repeat(rating) + "☆".repeat(5 - rating);
