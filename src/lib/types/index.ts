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
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: "MONTHLY" | "YEARLY";
  price: number;
  currency: string;
  nextBillingDate: string;
  trialEndDate: string | null;
  pastDueSince: string | null;
}

export interface Invoice {
  id: string;
  companyId: string;
  subscriptionId: string;
  number: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
  issuedAt: string;
}

export interface Plan {
  id: string;
  code: string;
  name: string;
  priceMonthly: number;
  priceYearly: number;
  setupFee: number;
  currency: string;
  trialDays: number;
  status: "active" | "inactive";
  limits: { maxUsers: number; maxBuses: number };
  featureCodes: string[];
}

export interface FeatureDef { code: string; name: string; kind: "boolean" | "quota" }

export type PartnerTierCode = Company["partnerTier"];
export interface PartnerTier { code: PartnerTierCode; minMonths: number; discountPercent: number }

export interface KycDocumentType { code: string; name: string; required: boolean; active: boolean }

export type SubscriptionChangeKind =
  | "ACTIVATION" | "UPGRADE" | "DOWNGRADE" | "PLAN_CHANGE" | "CANCELLATION";

export interface SubscriptionHistoryEntry {
  id: string;
  subscriptionId: string;
  kind: SubscriptionChangeKind;
  fromPlan: string | null;
  toPlan: string | null;
  at: string;
}

export interface PaymentAttempt {
  id: string;
  subscriptionId: string;
  companyId: string;
  amount: number;
  currency: string;
  status: "paid" | "failed";
  at: string;
  invoiceId: string | null;
  reason: string | null;
}

/** Simulated, deterministic outcome of a payment retry (seed parameter, never random). */
export type RetryOutcome = "success" | "failure";

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
  /** Platform account of the employee (`identity-service` user), null while the company is a draft. */
  userId: string | null;
}
/** Company-page projection of a bus (plate and status only). */
export interface FleetBus {
  id: string; companyId: string; plate: string; status: BusStatus;
}
/** Company-page projection of a trip (route label, departure and status only). */
export interface FleetTrip {
  id: string; companyId: string; route: string; departure: string; status: TripStatus;
}

export interface ActivityEntry {
  id: string; companyId: string | null; at: string; actor: string; action: string;
  /** Platform account the entry is about (role change, session revocation, contact reveal). */
  userId?: string;
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
  kycTypes: KycDocumentType[];
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

export type UserStatus = "active" | "suspended";

/** Platform account (`identity-service`). `email` and `phone` never leave the server. */
export interface PlatformUser {
  id: string;
  username: string;
  displayName: string;
  email: string;
  phone: string;
  roleCode: string;
  status: UserStatus;
  companyId: string | null;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface Role { code: string; name: string; description: string }

export type PermissionDomain =
  | "companies" | "fleet" | "bookings" | "parcels" | "hr" | "customers"
  | "marketing" | "notifications" | "compliance" | "monitoring" | "platform";

export interface PermissionDef { code: string; domain: PermissionDomain; description: string }

export interface RolePermission { roleCode: string; permissionCode: string }

/** A refresh-token session. `ipAddress` is the full address and never leaves the server. */
export interface UserSession {
  id: string;
  userId: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface Station { id: string; companyId: string; name: string; city: string }

export type RouteStatus = "active" | "inactive";

export interface Route {
  id: string; companyId: string; originId: string; destinationId: string;
  distanceKm: number; durationMinutes: number; status: RouteStatus;
}

export interface Fleet { id: string; companyId: string; name: string; depotId: string | null }

export type VendorKind = "GARAGE" | "INSURER" | "PARTS" | "OTHER";

export interface Vendor { id: string; companyId: string; name: string; kind: VendorKind }

export type BusStatus = "active" | "maintenance" | "retired";
export type BusType = "MINIBUS" | "COACH" | "STANDARD" | "ARTICULATED";
export type FuelType = "DIESEL" | "PETROL" | "ELECTRIC" | "HYBRID";

/** A bus (`fleet-service`). The three crew fields point to `CrewMember` ids, never to an account. */
export interface Bus {
  id: string;
  companyId: string;
  fleetId: string | null;
  busCode: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  busType: BusType;
  fuelType: FuelType;
  engineNumber: string;
  color: string;
  seatCapacity: number;
  standingCapacity: number;
  luggageCapacity: number;
  wheelchairAccessible: boolean;
  airConditioned: boolean;
  gpsEnabled: boolean;
  gpsDeviceId: string | null;
  cameraInstalled: boolean;
  fuelSensorInstalled: boolean;
  status: BusStatus;
  routeId: string | null;
  depotId: string | null;
  driverId: string | null;
  driverAssistantId: string | null;
  controllerId: string | null;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
  insuranceExpiry: string;
  technicalInspectionExpiry: string;
  registrationExpiry: string;
  purchaseDate: string;
  purchasePrice: number;
  retiredAt: string | null;
}

export type TripStatus = "planned" | "boarding" | "departed" | "cancelled";

export interface Trip {
  id: string; companyId: string; routeId: string; busId: string;
  departure: string; arrival: string; price: number; currency: string;
  totalSeats: number; availableSeats: number; status: TripStatus;
}

export type SeatState = "free" | "booked" | "occupied" | "blocked";

export interface SeatMap {
  id: string; companyId: string; busId: string; tripId: string;
  rows: number; columns: number; seats: { code: string; state: SeatState }[];
}

export type MaintenanceStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type MaintenanceCategory = "PREVENTIVE" | "CORRECTIVE" | "INSPECTION";

export interface BusMaintenance {
  id: string; companyId: string; busId: string; vendorId: string | null; code: string;
  type: string; category: MaintenanceCategory; status: MaintenanceStatus;
  scheduledDate: string; startedAt: string | null; completedAt: string | null;
  laborCost: number; partsCost: number;
  /** Labor plus parts, computed when the seed is built. */
  totalCost: number;
}

export type CrewRole = "DRIVER" | "DRIVER_ASSISTANT" | "CONTROLLER";

/**
 * Crew registry of the backoffice (stands in for the `hr-service` employees the platform assigns):
 * no account, no e-mail, no phone.
 */
export interface CrewMember { id: string; companyId: string; name: string; role: CrewRole }
