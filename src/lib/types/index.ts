export type CompanyStatus = "draft" | "active" | "suspended" | "closed";

export interface Company {
  id: string;
  slug: string;
  name: string;
  status: CompanyStatus;
  country: string;
  currency: string;
  contactEmail: string;
  contactPhone: string;
  registrationNumber: string;
  ninea: string;
  createdAt: string;
  activatedAt: string | null;
  forceActivated: boolean;
  dataRetentionDays: number | null;
  partnerTier: "STANDARD" | "SILVER" | "GOLD";
}

export type KycDocumentStatus = "pending" | "approved" | "rejected";

export interface KycDocument {
  id: string;
  companyId: string;
  typeCode: string;
  typeName: string;
  status: KycDocumentStatus;
  uploadedAt: string;
  reviewedAt: string | null;
  rejectionReason: string | null;
}

export type SubscriptionStatus =
  | "trial" | "active" | "past_due" | "suspended" | "expired" | "canceled";

export interface Subscription {
  id: string;
  companyId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  nextBillingDate: string;
}

export interface Invoice {
  id: string;
  companyId: string;
  number: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
  issuedAt: string;
}

export interface PlanLimits {
  maxUsers: number;
  usedUsers: number;
  maxBuses: number;
  usedBuses: number;
}

export interface FeatureFlag { code: string; name: string; enabled: boolean }
export interface UsageMetric { metricCode: string; label: string; value: number }
export interface ReferralCredit {
  id: string; amount: number; currency: string; status: "AVAILABLE" | "APPLIED";
}
export interface Referral { code: string | null; credits: ReferralCredit[] }

export interface Employee {
  id: string; companyId: string; name: string; email: string; phone: string;
  role: "MANAGER" | "GUICHETIER" | "CHAUFFEUR";
}
export interface FleetBus {
  id: string; companyId: string; plate: string; status: "active" | "maintenance";
}
export interface FleetTrip {
  id: string; companyId: string; route: string; departure: string;
  status: "planned" | "boarding" | "departed";
}

export interface ActivityEntry {
  id: string; companyId: string | null; at: string; actor: string; action: string;
}

export interface ServiceHealth {
  name: string; status: "healthy" | "degraded" | "down"; responseTimeMs: number;
}
export interface Incident {
  id: string; code: string; title: string; serviceName: string;
  severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  status: "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
  detectedAt: string;
}
export interface DsrRequest {
  id: string; type: "ACCESS" | "ERASURE" | "RECTIFICATION";
  status: "RECEIVED" | "IN_PROGRESS"; dueDate: string; requesterRef: string;
}

export interface CompanyDetail {
  company: Company;
  documents: KycDocument[];
  subscription: Subscription | null;
  invoices: Invoice[];
  limits: PlanLimits | null;
  features: FeatureFlag[];
  usage: UsageMetric[];
  referral: Referral;
  employees: Employee[];
  buses: FleetBus[];
  trips: FleetTrip[];
  activity: ActivityEntry[];
}
