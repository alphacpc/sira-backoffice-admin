import type { Tone } from "@/components/data/status-badge";
import type {
  CompanyStatus, FeatureDef, Incident, Invoice, KycDocumentStatus, PaymentAttempt, PermissionDomain, Plan,
  ServiceHealth, Subscription, SubscriptionChangeKind, SubscriptionStatus, UserStatus,
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
