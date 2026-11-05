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
  /** « backoffice » marks the Sira admin-team journal; it is kept out of the Vue 360 recent activity. */
  scope?: "backoffice";
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

export type BookingStatus = "confirmed" | "cancelled";
export type BookingPaymentStatus = "pending" | "paid" | "failed";
export type BookingChannel = "counter" | "online";
/** Who ended the booking: the unpaid-booking expiry, the client, or the platform team. */
export type CancelReason = "EXPIRED" | "CLIENT" | "PLATFORM";

/** Traveller booking (`booking-service`). A passenger has a name only: no e-mail, no phone. */
export interface Booking {
  id: string; companyId: string; tripId: string;
  /** Client account for an online booking, `null` at the counter. */
  userId: string | null;
  passengerName: string;
  bookingCode: string;
  seatNumber: string | null;
  status: BookingStatus; paymentStatus: BookingPaymentStatus; channel: BookingChannel;
  amount: number; currency: string; ticketIssued: boolean;
  createdAt: string; cancelledAt: string | null; cancelReason: CancelReason | null;
}

export type PaymentMethodKind = "MOBILE_MONEY" | "CARD" | "CASH";

export interface PaymentMethod {
  id: string; companyId: string; name: string; kind: PaymentMethodKind; provider: string | null; active: boolean;
}

export type TransactionStatus = "PENDING" | "COMPLETED" | "FAILED";

export interface Transaction {
  id: string; companyId: string; bookingId: string; paymentMethodId: string; reference: string;
  amount: number; currency: string; status: TransactionStatus; failureReason: string | null;
  createdAt: string; completedAt: string | null;
}

export type TicketStatus = "ISSUED" | "CHECKED_IN" | "USED" | "CANCELLED";
export type AnomalyKind = "STUCK" | "AMOUNT_MISMATCH" | "MISSING_TICKET";

export interface Ticket {
  id: string; companyId: string; bookingId: string; tripId: string; ticketCode: string;
  seatNumber: string | null; status: TicketStatus; issuedAt: string;
  /** ISO dates of the scans, oldest first. */
  scans: string[];
  /** Crew member (controller) who performed each scan, aligned with `scans`; `null` when unknown. */
  scannedBy?: (string | null)[];
}

export type ParcelStatus = "PENDING" | "IN_TRANSIT" | "AT_HUB" | "DELIVERED" | "CANCELLED" | "RETURNED" | "LOST";
export type ParcelType = "DOCUMENT" | "PACKAGE" | "FRAGILE" | "PERISHABLE" | "OTHER";
export type ParcelPaymentStatus = "PENDING" | "PAID" | "REFUNDED";

/** Parcel (`parcel-service`). `recipientPhone` never leaves the server unmasked. */
export interface Parcel {
  id: string; companyId: string; parcelCode: string; trackingNumber: string;
  senderName: string; senderCustomerId: string | null;
  recipientName: string; recipientPhone: string;
  weightKg: number; parcelType: ParcelType; description: string;
  tripId: string; originStationId: string; destinationStationId: string;
  pickupAt: string; expectedDeliveryAt: string; actualDeliveryAt: string | null;
  status: ParcelStatus; shippingFee: number; currency: string; paymentStatus: ParcelPaymentStatus;
  createdAt: string;
}

/** One trip a parcel is assigned to (a parcel going through a hub has two). */
export interface ParcelLeg {
  id: string; parcelId: string; companyId: string; tripId: string; assignmentCode: string; sequence: number;
}

export interface ParcelHistoryEntry {
  id: string; parcelId: string; previousStatus: ParcelStatus | null; newStatus: ParcelStatus;
  notes: string | null; changedBy: string | null; changedAt: string;
}

export type MembershipType = "REGULAR" | "VIP" | "PREMIUM";

/** Client profile (`customer-service`). Points and tier live on the per-company loyalty account. */
export interface Customer {
  id: string; userId: string; name: string; isCorporate: boolean;
  sponsorshipId: string | null; sponsoredAt: string | null; createdAt: string;
}

export type LoyaltyProgramStatus = "ACTIVE" | "INACTIVE";

export interface LoyaltyProgram {
  id: string; companyId: string; name: string; pointsPerCurrencyUnit: number; redemptionRate: number;
  minPointsForRedemption: number; status: LoyaltyProgramStatus; createdAt: string;
}

export interface LoyaltyAccount {
  id: string; customerId: string; companyId: string; points: number; membershipType: MembershipType; createdAt: string;
}

export interface LoyaltyTransaction {
  id: string; accountId: string; bookingId: string; points: number; createdAt: string;
}

export type SponsorshipRewardType = "DISCOUNT" | "LOYALTY_POINTS" | "CASH";
export type SponsorshipStatus = "ACTIVE" | "REDEEMED" | "EXPIRED";

export interface Sponsorship {
  id: string; companyId: string; sponsorCustomerId: string; code: string;
  rewardType: SponsorshipRewardType; rewardValue: number; status: SponsorshipStatus;
  createdAt: string; expiresAt: string;
}

export type FeedbackType = "TRIP" | "BUS" | "STATION" | "SERVICE" | "PARCEL";
export type FeedbackStatus = "PENDING" | "REVIEWED" | "RESOLVED" | "IGNORED";

export interface Feedback {
  id: string; companyId: string; customerId: string;
  tripId: string | null; parcelId: string | null; bookingId: string | null;
  rating: number; feedbackType: FeedbackType; title: string; comment: string;
  status: FeedbackStatus; response: string | null; respondedAt: string | null; createdAt: string;
}

export type NotificationChannel = "EMAIL" | "SMS" | "IN_APP" | "PUSH" | "WHATSAPP";
export type NotificationStatus = "PENDING" | "SENT" | "FAILED";

/** Delivered (or failed) message (`notification-service`). `messageContent` never leaves the server except on a journaled reveal. */
export interface AppNotification {
  id: string; companyId: string; entityType: string; entityId: string;
  notificationCode: string; notificationType: string;
  /** Receiving account; `null` for the SMS of a parcel recipient who has no account. */
  sentTo: string | null;
  channel: NotificationChannel; status: NotificationStatus;
  scheduledAt: string | null; sentAt: string | null; retryCount: number; read: boolean;
  messageContent: string; createdAt: string;
}

export type CampaignObjective = "ACQUISITION" | "RETENTION" | "PROMOTION" | "REACTIVATION";
export type CampaignStatus = "DRAFT" | "SCHEDULED" | "RUNNING" | "COMPLETED" | "CANCELLED";

export interface MarketingCampaign {
  id: string; companyId: string; name: string; objective: CampaignObjective; status: CampaignStatus;
  startDate: string; endDate: string; budget: number; currency: string;
  /** Platform account of the author (the dbml points to an Employee; `customer-service` stores the account). */
  createdByUserId: string | null;
  createdAt: string; updatedAt: string | null;
}

export interface MarketingSegment {
  id: string; companyId: string;
  /** `null` for a segment that can be reused by several campaigns. */
  campaignId: string | null;
  name: string;
  /** Targeting rules; only `membershipType` is ever evaluated. */
  criteria: Record<string, string>;
  estimatedSize: number; createdAt: string;
}

export type MarketingMessageStatus = "DRAFT" | "APPROVED" | "SENT";

export interface MarketingMessage {
  id: string; companyId: string; campaignId: string; channel: NotificationChannel;
  subject: string; content: string; status: MarketingMessageStatus; createdAt: string;
}

export type ScheduleStatus = "PENDING" | "SENT" | "FAILED" | "CANCELLED";

export interface MarketingSchedule {
  id: string; companyId: string; campaignId: string; messageId: string; segmentId: string;
  scheduledAt: string; sentAt: string | null; status: ScheduleStatus; recipientsCount: number; createdAt: string;
}

export type DsrType = "ACCESS" | "RECTIFICATION" | "ERASURE" | "PORTABILITY" | "RESTRICTION" | "OBJECTION";
export type DsrStatus = "RECEIVED" | "IN_PROGRESS" | "COMPLETED" | "REJECTED";

/** Data-subject request (`audit-compliance-service`). Replaces the lot 1 `DsrRequest` stub. */
export interface DataSubjectRequest {
  id: string; requesterUserId: string;
  /** `null` for a platform-level request. */
  companyId: string | null;
  requestType: DsrType; status: DsrStatus; reason: string;
  /** Label of the backoffice identity that handled it (the dbml points to an Employee). */
  handledBy: string | null;
  /** Creation plus 30 days. */
  dueDate: string; resolvedAt: string | null; resolutionNotes: string | null; createdAt: string;
}

export type ConsentType = "MARKETING_EMAIL" | "MARKETING_SMS" | "DATA_SHARING_PARTNERS" | "COOKIES_ANALYTICS" | "GEOLOCATION";
export type ConsentStatus = "GRANTED" | "WITHDRAWN";
export type ConsentSource = "SIGNUP" | "SETTINGS_PAGE" | "BOOKING_FLOW";

/** Append-only consent history: one row per change, never rewritten. */
export interface ConsentRecord {
  id: string; userId: string; consentType: ConsentType;
  /** Required for the two marketing types, forbidden otherwise (a legacy marketing row may lack it). */
  companyId: string | null;
  status: ConsentStatus; consentVersion: string; source: ConsentSource;
  grantedAt: string | null; withdrawnAt: string | null; createdAt: string;
}

export type AuditActorType = "USER" | "EMPLOYEE" | "SYSTEM" | "API_KEY";
export type AuditAction = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGIN_FAILED" | "EXPORT" | "PERMISSION_CHANGE";

/** Append-only audit trail line. Origin fields are `null` once anonymised by the retention job. */
export interface AuditLog {
  id: string; companyId: string | null;
  actorUserId: string | null;
  /** Backoffice identity when the line was written by a backoffice action (not a platform account). */
  actorLabel: string | null;
  actorType: AuditActorType; action: AuditAction; entityType: string; entityId: string;
  beforeState: Record<string, string> | null; afterState: Record<string, string> | null;
  ipAddress: string | null; userAgent: string | null;
  sourceService: string | null; occurredAt: string | null; createdAt: string;
}

export type DataSubjectType = "CUSTOMER" | "EMPLOYEE" | "USER";
export type DataCategory = "IDENTITY" | "FINANCIAL" | "LOCATION" | "HEALTH" | "CONTACT" | "CONSENT";
export type AccessReason = "SUPPORT_REQUEST" | "LEGAL_OBLIGATION" | "SERVICE_DELIVERY" | "INVESTIGATION";
export type AccessType = "VIEW" | "EXPORT" | "MODIFY" | "DELETE";

/** Append-only log of accesses to personal data. */
export interface DataAccessLog {
  id: string; accessedByUserId: string | null; accessedByLabel: string | null;
  dataSubjectType: DataSubjectType; dataSubjectId: string; dataCategory: DataCategory;
  accessReason: AccessReason; accessType: AccessType; ipAddress: string | null; createdAt: string;
}

export type ServiceStatus = "healthy" | "degraded" | "down";

/** One poll of a service (`monitoring-service`). The error rate is never computed by the backend. */
export interface ServiceHealthCheck {
  id: string; serviceName: string; environment: "production";
  status: ServiceStatus; responseTimeMs: number; errorRatePercent: number | null; checkedAt: string;
}

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type IncidentStatus = "INVESTIGATING" | "IDENTIFIED" | "MONITORING" | "RESOLVED";
export type ImpactScope = "SINGLE_COMPANY" | "MULTI_COMPANY" | "PLATFORM_WIDE";

/** Platform incident, declared and followed by hand. Only its current state is kept. */
export interface SystemIncident {
  id: string; incidentCode: string; serviceName: string;
  severity: IncidentSeverity; status: IncidentStatus; title: string; description: string | null;
  impactScope: ImpactScope;
  /** Set if and only if the scope is `SINGLE_COMPANY`. */
  affectedCompanyId: string | null;
  detectedAt: string;
  /** Set if and only if the incident is resolved. */
  resolvedAt: string | null;
  /** Label of the backoffice identity that declared it (the backend stores a user id). */
  reportedBy: string;
  postmortemUrl: string | null;
  createdAt: string; updatedAt: string | null;
}

export type ApiStatusClass = "2xx" | "4xx" | "5xx";

/** Daily API traffic aggregate, the shape `GET /usage/api` returns (raw log lines never leave the server). */
export interface ApiUsageRow {
  day: string; companyId: string | null; endpoint: string; method: "GET" | "POST" | "PATCH";
  statusClass: ApiStatusClass; count: number; avgResponseMs: number; maxResponseMs: number;
}

export type AdminStatus = "active" | "suspended" | "invited";

/** Backoffice administrator. The login identifier (`prenom.nom@sira.app`) is a service identifier, not contact data. */
export interface BackofficeAdmin {
  id: string;
  identifier: string;
  displayName: string;
  status: AdminStatus;
  totpEnabled: boolean;
  totpEnrolledAt: string | null;
  /** Only the number of recovery codes left is kept, never the codes. */
  recoveryCodesRemaining: number;
  lastLoginAt: string | null;
  createdAt: string;
}

/** A backoffice session (8 hours, like the real cookie). `ipAddress` is the full address and never leaves the server. */
export interface BackofficeSession {
  id: string;
  adminId: string;
  deviceLabel: string;
  ipAddress: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  revokedAt: string | null;
  revokedReason: string | null;
  /** The session of the signed-in administrator (the real cookie carries no session id). */
  current: boolean;
}

/** Stage of a company in the KYC review board. `approved` is never stored: it means the company is active. */
export type KycStage = "submitted" | "needs_info" | "in_review" | "approved" | "rejected";
export interface KycOverride { stage: Exclude<KycStage, "approved">; note: string | null; at: string }

export type RentalStatus = "REQUESTED" | "QUOTED" | "CONFIRMED" | "COMPLETED" | "CANCELLED";
export type RentalPurpose = "WEDDING" | "SCHOOL" | "SPORT" | "BUSINESS" | "PILGRIMAGE" | "OTHER";

/** Charter of a whole bus to a client (customer, school, team, firm). `customerPhone` never leaves the server unmasked. */
export interface Rental {
  id: string; companyId: string; rentalCode: string;
  customerName: string; customerPhone: string; purpose: RentalPurpose; passengers: number;
  pickup: string; destination: string; departure: string;
  /** `null` for a one-way trip. */
  returnAt: string | null; estimatedKm: number;
  busId: string | null; driverId: string | null;
  status: RentalStatus;
  quoteAmount: number | null; currency: string;
  /** Deposit that must be paid before the rental can be confirmed. */
  depositRequired: number;
  cautionAmount: number;
  paidAmount: number;
  payments: { at: string; amount: number }[];
  history: { at: string; label: string; actor: string }[];
  /** Invoice issued when the quote is sent; `null` while the rental is only a request. */
  invoiceNumber: string | null; invoiceIssuedAt: string | null;
  createdAt: string; cancelledAt: string | null; cancelReason: string | null;
}

/** How a company's invoices look: logo, two colours, texts. */
export interface InvoiceTemplate {
  /** `data:image/...;base64,` URL, or `null` to show the company monogram. */
  logoDataUrl: string | null;
  primaryColor: string; accentColor: string;
  headerNote: string; footerNote: string; legalMentions: string;
  /** VAT rate in percent, 0 hides the VAT lines. */
  taxRate: number; paymentTermsDays: number; showQr: boolean;
}
