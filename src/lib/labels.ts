import type { Tone } from "@/components/data/status-badge";
import type {
  CompanyStatus, Incident, Invoice, KycDocumentStatus, ServiceHealth, SubscriptionStatus,
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
