import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Booking, BookingChannel, BookingPaymentStatus, BookingStatus, Bus, BusMaintenance, BusType, Company, CompanyStatus, CrewMember, CrewRole,
  AccessReason, AccessType, AuditAction, AuditActorType, AuditLog, ConsentRecord, ConsentSource, ConsentStatus, ConsentType, DataAccessLog, DataCategory, DataSubjectRequest, DataSubjectType, DsrStatus, DsrType,
  Employee, FeatureDef, FeatureFlag, Fleet, FuelType, Invoice, KycDocument, KycDocumentType,
  MaintenanceCategory, MaintenanceStatus, PartnerTier, PaymentAttempt, PermissionDef, Plan, PlanLimits,
  PlatformUser, Referral, RetryOutcome, Role, RolePermission, Route, SeatMap, SeatState,
  Station, Subscription, SubscriptionChangeKind, SubscriptionHistoryEntry, SubscriptionStatus, Trip,
  PaymentMethod, PaymentMethodKind, Ticket, TicketStatus, Transaction, TransactionStatus,
  Customer, Feedback, FeedbackStatus, FeedbackType, LoyaltyAccount, LoyaltyProgram, LoyaltyTransaction, MembershipType,
  Parcel, ParcelHistoryEntry, ParcelLeg, ParcelStatus, ParcelType, Sponsorship, SponsorshipRewardType, SponsorshipStatus,
  AppNotification, CampaignObjective, CampaignStatus, MarketingCampaign, MarketingMessage, MarketingMessageStatus, MarketingSchedule, MarketingSegment, NotificationChannel, NotificationStatus, ScheduleStatus,
  AdminStatus, BackofficeAdmin, BackofficeSession,
  ApiUsageRow, ImpactScope, IncidentSeverity, IncidentStatus, ServiceHealthCheck, ServiceStatus, SystemIncident,
  CancelReason, TripStatus, UsageMetric, UserSession, UserStatus, Vendor, VendorKind,
} from "@/lib/types";

const DAY = 86_400_000;

export interface Store {
  companies: Company[];
  documents: KycDocument[];
  subscriptions: Subscription[];
  invoices: Invoice[];
  limits: Record<string, PlanLimits>;
  features: Record<string, FeatureFlag[]>;
  usage: Record<string, UsageMetric[]>;
  referrals: Record<string, Referral>;
  employees: Employee[];
  buses: Bus[];
  trips: Trip[];
  activity: ActivityEntry[];
  dataSubjectRequests: DataSubjectRequest[];
  consentRecords: ConsentRecord[];
  auditLogs: AuditLog[];
  dataAccessLogs: DataAccessLog[];
  serviceChecks: ServiceHealthCheck[];
  systemIncidents: SystemIncident[];
  apiUsage: ApiUsageRow[];
  backofficeAdmins: BackofficeAdmin[];
  backofficeSessions: BackofficeSession[];
  plans: Plan[];
  featureDefs: FeatureDef[];
  partnerTiers: PartnerTier[];
  kycTypes: KycDocumentType[];
  subscriptionHistory: SubscriptionHistoryEntry[];
  paymentAttempts: PaymentAttempt[];
  retryOutcomes: Record<string, RetryOutcome>;
  users: PlatformUser[];
  roles: Role[];
  permissions: PermissionDef[];
  rolePermissions: RolePermission[];
  sessions: UserSession[];
  stations: Station[];
  routes: Route[];
  fleets: Fleet[];
  vendors: Vendor[];
  seatMaps: SeatMap[];
  maintenances: BusMaintenance[];
  crew: CrewMember[];
  paymentMethods: PaymentMethod[];
  bookings: Booking[];
  transactions: Transaction[];
  tickets: Ticket[];
  parcels: Parcel[];
  parcelLegs: ParcelLeg[];
  parcelHistory: ParcelHistoryEntry[];
  customers: Customer[];
  loyaltyPrograms: LoyaltyProgram[];
  loyaltyAccounts: LoyaltyAccount[];
  loyaltyTransactions: LoyaltyTransaction[];
  sponsorships: Sponsorship[];
  feedbacks: Feedback[];
  notifications: AppNotification[];
  marketingCampaigns: MarketingCampaign[];
  marketingSegments: MarketingSegment[];
  marketingMessages: MarketingMessage[];
  marketingSchedules: MarketingSchedule[];

}

const NAMES = [
  "Sahel Express", "Teranga Bus", "Dakar Voyages", "Atlantique Transport",
  "Baobab Lines", "Casamance Trans", "Kaolack Cars", "Saint-Louis Route",
  "Thiès Mobilité", "Ziguinchor Express", "Touba Liaison", "Mbour Coast",
  "Diourbel Cars", "Tamba Rapide", "Louga Trans", "Kolda Voyages",
  "Fatick Lines", "Matam Express", "Richard-Toll Bus", "Saly Shuttle",
];

const DRAFT_INDEXES = [12, 13, 14, 15, 19];
const APPROVED_BY_DRAFT = [1, 2, 3, 5, 4];
const SUBSCRIPTION_STATUS: Record<number, SubscriptionStatus> = {
  0: "active", 1: "active", 2: "trial", 3: "active", 4: "past_due", 5: "active",
  6: "active", 7: "past_due", 8: "active", 9: "trial", 10: "active", 11: "active",
  16: "suspended", 17: "expired", 18: "canceled",
};
/** Days since the first unpaid charge (Baobab Lines, Saint-Louis Route, Fatick Lines). */
const PAST_DUE_SINCE_DAYS: Record<number, number> = { 4: 2, 7: 5, 16: 20 };
/** Deterministic retry results: the demo shows one refused payment (Saint-Louis Route). */
const RETRY_OUTCOMES: Record<number, RetryOutcome> = { 4: "success", 7: "failure", 16: "success" };
/** Plan changes before the current plan (the current plan is PLANS[index % 3]). */
const PLAN_CHANGES: Record<number, { kind: SubscriptionChangeKind; from: string }> = {
  1: { kind: "UPGRADE", from: "Starter" },
  5: { kind: "UPGRADE", from: "Pro" },
  6: { kind: "DOWNGRADE", from: "Pro" },
};

interface PlanDef {
  code: string; name: string; price: number; yearly: number; setup: number; trial: number;
  users: number; buses: number; features: string[]; status: Plan["status"];
}

const PLANS: PlanDef[] = [
  { code: "STARTER", name: "Starter", price: 10000, yearly: 100000, setup: 0, trial: 14, users: 10, buses: 5,
    features: ["ONLINE_BOOKING", "FLEET", "API_CALLS"], status: "active" },
  { code: "PRO", name: "Pro", price: 25000, yearly: 250000, setup: 50000, trial: 14, users: 50, buses: 25,
    features: ["ONLINE_BOOKING", "FLEET", "PARCELS", "API_CALLS", "SMS_NOTIFICATIONS"], status: "active" },
  { code: "ENTERPRISE", name: "Enterprise", price: 60000, yearly: 600000, setup: 150000, trial: 30, users: 500, buses: 200,
    features: ["ONLINE_BOOKING", "FLEET", "PARCELS", "HR", "API_CALLS", "SMS_NOTIFICATIONS"], status: "active" },
];
const LEGACY_PLAN: PlanDef = {
  code: "LEGACY", name: "Legacy", price: 8000, yearly: 80000, setup: 0, trial: 0, users: 5, buses: 3,
  features: ["ONLINE_BOOKING", "FLEET"], status: "inactive",
};

const FEATURE_DEFS: FeatureDef[] = [
  { code: "ONLINE_BOOKING", name: "Réservation en ligne", kind: "boolean" },
  { code: "FLEET", name: "Gestion de flotte", kind: "boolean" },
  { code: "PARCELS", name: "Colis", kind: "boolean" },
  { code: "HR", name: "Ressources humaines", kind: "boolean" },
  { code: "API_CALLS", name: "Appels API", kind: "quota" },
  { code: "SMS_NOTIFICATIONS", name: "Notifications SMS", kind: "quota" },
];

const TIERS: PartnerTier[] = [
  { code: "STANDARD", minMonths: 0, discountPercent: 0 },
  { code: "SILVER", minMonths: 6, discountPercent: 5 },
  { code: "GOLD", minMonths: 12, discountPercent: 10 },
];

/** Real permission codes of the platform (`identity-service` migrations), grouped by domain. */
const PERMISSIONS: PermissionDef[] = [
  { code: "COMPANY_MANAGE", domain: "companies", description: "Gérer les compagnies et leur facturation" },
  { code: "COMPANY_KYC_SUBMIT", domain: "companies", description: "Déposer les documents KYC de sa compagnie" },
  { code: "COMPANY_KYC_REVIEW", domain: "companies", description: "Revoir les documents KYC et forcer une activation" },
  { code: "COMPANY_PARTNERSHIP_MANAGE", domain: "companies", description: "Gérer le parrainage et les crédits de sa compagnie" },
  { code: "FLEET_MANAGE", domain: "fleet", description: "Gérer gares, lignes, bus et trajets" },
  { code: "FLEET_MAINTENANCE_MANAGE", domain: "fleet", description: "Gérer la maintenance des bus et les fournisseurs" },
  { code: "BOOKING_MANAGE", domain: "bookings", description: "Vendre et gérer les réservations et billets" },
  { code: "PARCEL_MANAGE", domain: "parcels", description: "Gérer les colis" },
  { code: "EMPLOYEE_MANAGE", domain: "hr", description: "Gérer les employés, congés, paie et avantages" },
  { code: "EMPLOYEE_CONFIDENTIAL_ACCESS", domain: "hr", description: "Accéder aux documents RH confidentiels" },
  { code: "CUSTOMER_MANAGE", domain: "customers", description: "Gérer les clients, la fidélité et les avis" },
  { code: "MARKETING_MANAGE", domain: "marketing", description: "Gérer les campagnes marketing" },
  { code: "NOTIFICATION_MANAGE", domain: "notifications", description: "Consulter et gérer les notifications" },
  { code: "COMPLIANCE_READ", domain: "compliance", description: "Lire les consentements et les journaux d'audit" },
  { code: "COMPLIANCE_MANAGE", domain: "compliance", description: "Traiter les demandes des personnes concernées" },
  { code: "MONITORING_READ", domain: "monitoring", description: "Lire la santé des services, les incidents et l'usage" },
  { code: "MONITORING_MANAGE", domain: "monitoring", description: "Déclarer et suivre les incidents" },
  { code: "RBAC_MANAGE", domain: "platform", description: "Gérer les rôles des comptes" },
  { code: "USER_MANAGE", domain: "platform", description: "Consulter les comptes utilisateurs" },
];

const ROLES: Role[] = [
  { code: "ADMIN", name: "Administrateur", description: "Équipe plateforme Sira : toutes les permissions de plateforme." },
  { code: "MANAGER", name: "Responsable de compagnie", description: "Gère sa compagnie ; jamais les permissions de plateforme." },
  { code: "GUICHETIER", name: "Agent de vente", description: "Vend des billets au guichet de sa compagnie." },
  { code: "CHAUFFEUR", name: "Chauffeur", description: "Rôle métier réservé, sans permission." },
  { code: "USER", name: "Utilisateur", description: "Client final : réservation en libre-service, sans permission." },
];

/** Grants as seeded by the platform migrations (EMPLOYEE_CONFIDENTIAL_ACCESS is granted to no role). */
const ROLE_GRANTS: Record<string, string[]> = {
  ADMIN: [
    "COMPANY_MANAGE", "COMPANY_KYC_SUBMIT", "COMPANY_KYC_REVIEW", "FLEET_MANAGE", "FLEET_MAINTENANCE_MANAGE",
    "BOOKING_MANAGE", "PARCEL_MANAGE", "EMPLOYEE_MANAGE", "CUSTOMER_MANAGE", "MARKETING_MANAGE",
    "NOTIFICATION_MANAGE", "COMPLIANCE_READ", "COMPLIANCE_MANAGE", "MONITORING_READ", "MONITORING_MANAGE",
    "RBAC_MANAGE", "USER_MANAGE",
  ],
  MANAGER: [
    "COMPANY_MANAGE", "COMPANY_KYC_SUBMIT", "COMPANY_PARTNERSHIP_MANAGE", "FLEET_MANAGE", "FLEET_MAINTENANCE_MANAGE",
    "BOOKING_MANAGE", "PARCEL_MANAGE", "EMPLOYEE_MANAGE", "CUSTOMER_MANAGE", "MARKETING_MANAGE",
    "NOTIFICATION_MANAGE", "USER_MANAGE",
  ],
  GUICHETIER: ["BOOKING_MANAGE", "FLEET_MANAGE", "USER_MANAGE"],
  CHAUFFEUR: [],
  USER: [],
};

const SESSION_TTL_DAYS = 7;
const DEVICES = ["Chrome · Windows", "Safari · iPhone", "Application Android", "Firefox · Ubuntu", "Edge · Windows"];
const PLATFORM_ADMINS: { username: string; displayName: string; status: UserStatus }[] = [
  { username: "moustapha.ndiaye", displayName: "Moustapha Ndiaye", status: "active" },
  { username: "seynabou.kane", displayName: "Seynabou Kane", status: "suspended" },
];
const CLIENTS: { username: string; displayName: string; status: UserStatus }[] = [
  { username: "aissatou.sarr", displayName: "Aïssatou Sarr", status: "active" },
  { username: "pape.mbaye", displayName: "Pape Mbaye", status: "suspended" },
  { username: "ndeye.diouf", displayName: "Ndèye Diouf", status: "active" },
  { username: "lamine.camara", displayName: "Lamine Camara", status: "active" },
];

/** Station cities; a company's stations step by 3 through this list, so they never repeat within it. */
const CITIES = ["Dakar", "Thiès", "Saint-Louis", "Touba", "Kaolack", "Ziguinchor", "Mbour", "Tambacounda"];
const BUS_MODELS: {
  brand: string; model: string; busType: BusType; fuelType: FuelType;
  seats: number; standing: number; luggage: number; price: number;
}[] = [
  { brand: "Mercedes-Benz", model: "Tourismo", busType: "COACH", fuelType: "DIESEL", seats: 53, standing: 0, luggage: 9, price: 95_000_000 },
  { brand: "BYD", model: "K9", busType: "STANDARD", fuelType: "ELECTRIC", seats: 41, standing: 30, luggage: 1, price: 120_000_000 },
  { brand: "Yutong", model: "ZK6122H", busType: "COACH", fuelType: "HYBRID", seats: 55, standing: 0, luggage: 10, price: 80_000_000 },
  { brand: "King Long", model: "XMQ6127", busType: "COACH", fuelType: "DIESEL", seats: 51, standing: 0, luggage: 8, price: 70_000_000 },
  { brand: "Toyota", model: "Coaster", busType: "MINIBUS", fuelType: "PETROL", seats: 29, standing: 0, luggage: 2, price: 35_000_000 },
];
const COLORS = ["Blanc", "Bleu", "Jaune", "Vert", "Rouge", "Gris"];
const VENDORS: { name: string; kind: VendorKind }[] = [
  { name: "Garage Central", kind: "GARAGE" },
  { name: "Assurances Askia", kind: "INSURER" },
];
const CREW_FIRST = ["Abdou", "Babacar", "Modou", "Saliou", "Alioune", "Mamadou", "Serigne", "Assane", "Ndiaga", "Daouda", "Boubacar"];
const CREW_LAST = ["Diagne", "Mbaye", "Thiam", "Gaye", "Seck", "Cissé", "Ndao", "Wade", "Badji", "Sané", "Lo"];
const MAINTENANCE_TYPES: { type: string; category: MaintenanceCategory }[] = [
  { type: "Vidange", category: "PREVENTIVE" },
  { type: "Freins", category: "CORRECTIVE" },
  { type: "Contrôle technique", category: "INSPECTION" },
  { type: "Pneus", category: "CORRECTIVE" },
  { type: "Révision générale", category: "PREVENTIVE" },
];
/** Insurance, technical inspection and registration expiries (days from `now`), cycled per bus. */
const INSURANCE_DAYS = [-12, 15, 120, 200, 60];
const INSPECTION_DAYS = [90, -5, 25, 300, 180];
const REGISTRATION_DAYS = [365, 400, 10, 500, -30];
/** The single retired bus of the seed: last bus of Dakar Voyages (company index 2). */
const RETIRED_COMPANY_INDEX = 2;
const SEAT_COLUMNS = 4;
/**
 * Trips of a bus by pattern `(company index + bus index) % 4` (days from `now`): pattern 0 is boarding
 * then planned, 1 planned, 2 departed then cancelled, 3 departed. Patterns 2 and 3 leave no trip to come.
 */
const TRIP_PATTERNS: { status: TripStatus; day: number }[][] = [
  [{ status: "boarding", day: 0.1 }, { status: "planned", day: 2 }],
  [{ status: "planned", day: 1 }],
  [{ status: "departed", day: -1 }, { status: "cancelled", day: 3 }],
  [{ status: "departed", day: -2 }],
];
const PEOPLE = [
  "Awa Diop", "Moussa Fall", "Fatou Ndiaye", "Ibrahima Sow", "Mariama Ba",
  "Cheikh Sy", "Aminata Gueye", "Ousmane Diallo", "Khady Faye",
];

function uid(prefix: number, n: number): string {
  return `${prefix.toString(16).padStart(8, "0")}-0000-4000-8000-${String(n).padStart(12, "0")}`;
}

function slugify(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function buildSeed(now: Date = new Date()): Store {
  const iso = (offsetDays: number) => new Date(now.getTime() + offsetDays * DAY).toISOString();
  const store: Store = {
    companies: [], documents: [], subscriptions: [], invoices: [], limits: {},
    features: {}, usage: {}, referrals: {}, employees: [], buses: [], trips: [],
    activity: [], dataSubjectRequests: [], consentRecords: [], auditLogs: [], dataAccessLogs: [],
    serviceChecks: [], systemIncidents: [], apiUsage: [], backofficeAdmins: [], backofficeSessions: [],
    plans: [], featureDefs: [], partnerTiers: [], kycTypes: [],
    subscriptionHistory: [], paymentAttempts: [], retryOutcomes: {},
    users: [], roles: [], permissions: [], rolePermissions: [], sessions: [],
    stations: [], routes: [], fleets: [], vendors: [], seatMaps: [], maintenances: [], crew: [],
    paymentMethods: [], bookings: [], transactions: [], tickets: [],
    parcels: [], parcelLegs: [], parcelHistory: [], customers: [], loyaltyPrograms: [],
    loyaltyAccounts: [], loyaltyTransactions: [], sponsorships: [], feedbacks: [],
    notifications: [], marketingCampaigns: [], marketingSegments: [], marketingMessages: [], marketingSchedules: [],
  };
  let docSeq = 1, subSeq = 1, invSeq = 1, empSeq = 1, actSeq = 1;
  let attSeq = 1, histSeq = 1, userSeq = 1, sessionSeq = 1;

  store.plans = [...PLANS, LEGACY_PLAN].map((p, n) => ({
    id: uid(12, n + 1), code: p.code, name: p.name, priceMonthly: p.price, priceYearly: p.yearly,
    setupFee: p.setup, currency: "XOF", trialDays: p.trial, status: p.status,
    limits: { maxUsers: p.users, maxBuses: p.buses }, featureCodes: [...p.features],
  }));
  store.featureDefs = FEATURE_DEFS.map((f) => ({ ...f }));
  store.partnerTiers = TIERS.map((t) => ({ ...t }));
  store.kycTypes = KYC_TYPES.map((t) => ({ code: t.code, name: t.name, required: true, active: true }));
  store.permissions = PERMISSIONS.map((p) => ({ ...p }));
  store.roles = ROLES.map((r) => ({ ...r }));
  store.rolePermissions = Object.entries(ROLE_GRANTS).flatMap(([roleCode, codes]) =>
    codes.map((permissionCode) => ({ roleCode, permissionCode })));

  NAMES.forEach((name, i) => {
    const draftIdx = DRAFT_INDEXES.indexOf(i);
    const status: CompanyStatus =
      draftIdx >= 0 ? "draft" : i < 12 ? "active" : i === 18 ? "closed" : "suspended";
    const id = uid(1, i + 1);
    const slug = slugify(name);
    const company: Company = {
      id, slug, name, status, country: "SN", currency: "XOF",
      contactEmail: `contact@${slug}.sn`,
      contactPhone: `+2217712${String(30000 + i * 137).padStart(5, "0")}`,
      registrationNumber: `SN-DKR-2024-B-${1000 + i}`,
      ninea: `00${4100000 + i * 37}2G2`,
      createdAt: iso(-(400 - i * 15)),
      activatedAt: status === "draft" ? null : iso(-(380 - i * 15)),
      forceActivated: i === 3,
      dataRetentionDays: i % 4 === 0 ? 365 : null,
      partnerTier: i < 3 ? "GOLD" : i < 8 ? "SILVER" : "STANDARD",
    };
    store.companies.push(company);

    // KYC documents
    KYC_TYPES.forEach((t, k) => {
      let docStatus: KycDocument["status"] | null = null;
      if (status !== "draft") docStatus = "approved";
      else {
        const approved = APPROVED_BY_DRAFT[draftIdx] ?? 0;
        if (k < approved) docStatus = "approved";
        else if (k === approved && approved < KYC_TYPES.length) docStatus = "pending";
        else if (k === approved + 1 && draftIdx === 2) docStatus = "rejected";
      }
      if (!docStatus) return;
      store.documents.push({
        id: uid(2, docSeq++), companyId: id, typeCode: t.code, typeName: t.name,
        status: docStatus,
        uploadedAt: iso(-(30 - k * 3 - draftIdx)),
        reviewedAt: docStatus === "pending" ? null : iso(-(20 - k)),
        rejectionReason: docStatus === "rejected" ? "Document illisible" : null,
      });
    });

    // Subscription, invoices, payment attempts, history, limits, features
    const subStatus = SUBSCRIPTION_STATUS[i];
    if (subStatus) {
      const plan = PLANS[i % 3]!;
      const planId = store.plans[i % 3]!.id;
      const subId = uid(3, subSeq++);
      const pastDueDays = PAST_DUE_SINCE_DAYS[i];
      store.subscriptions.push({
        id: subId, companyId: id, planId, planName: plan.name, status: subStatus,
        billingCycle: "MONTHLY", price: plan.price, currency: "XOF",
        nextBillingDate: iso(5 + i),
        trialEndDate: subStatus === "trial" ? iso(5 + i) : null,
        pastDueSince: pastDueDays === undefined ? null : iso(-pastDueDays),
      });

      const isTrial = subStatus === "trial";
      // A trial has not been billed yet: no invoice and no payment attempt.
      const failedAt = pastDueDays === undefined ? iso(-30) : iso(-pastDueDays);
      const invoices: Invoice[] = isTrial ? [] : [
        {
          id: uid(4, invSeq++), companyId: id, subscriptionId: subId,
          number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
          amount: plan.price, currency: "XOF", status: "paid", issuedAt: iso(-60),
        },
        {
          id: uid(4, invSeq++), companyId: id, subscriptionId: subId,
          number: `INV-2026-${String(invSeq).padStart(4, "0")}`,
          amount: plan.price, currency: "XOF",
          status: subStatus === "past_due" ? "failed" : "paid",
          issuedAt: subStatus === "past_due" ? failedAt : iso(-30),
        },
      ];
      for (const inv of invoices) {
        store.invoices.push(inv);
        store.paymentAttempts.push({
          id: uid(13, attSeq++), subscriptionId: subId, companyId: id,
          amount: inv.amount, currency: inv.currency, status: inv.status, at: inv.issuedAt,
          invoiceId: inv.id, reason: inv.status === "failed" ? "Solde insuffisant" : null,
        });
      }
      if (pastDueDays !== undefined) {
        store.paymentAttempts.push({
          id: uid(13, attSeq++), subscriptionId: subId, companyId: id, amount: plan.price,
          currency: "XOF", status: "failed", at: iso(-pastDueDays), invoiceId: null,
          reason: "Solde insuffisant",
        });
        if (subStatus === "suspended") {
          store.paymentAttempts.push({
            id: uid(13, attSeq++), subscriptionId: subId, companyId: id, amount: plan.price,
            currency: "XOF", status: "failed", at: iso(-pastDueDays + 7), invoiceId: null,
            reason: "Moyen de paiement expiré",
          });
        }
      }
      const outcome = RETRY_OUTCOMES[i];
      if (outcome) store.retryOutcomes[subId] = outcome;

      const change = PLAN_CHANGES[i];
      store.subscriptionHistory.push({
        id: uid(14, histSeq++), subscriptionId: subId, kind: "ACTIVATION",
        fromPlan: null, toPlan: change ? change.from : plan.name,
        at: isTrial ? iso(5 + i - plan.trial) : iso(-120),
      });
      if (change) {
        store.subscriptionHistory.push({
          id: uid(14, histSeq++), subscriptionId: subId, kind: change.kind,
          fromPlan: change.from, toPlan: plan.name, at: iso(-40),
        });
      }
      if (subStatus === "canceled") {
        store.subscriptionHistory.push({
          id: uid(14, histSeq++), subscriptionId: subId, kind: "CANCELLATION",
          fromPlan: plan.name, toPlan: null, at: iso(-10),
        });
      }

      store.limits[id] = {
        maxUsers: plan.users, usedUsers: Math.min(plan.users, 3 + i * 2),
        maxBuses: plan.buses, usedBuses: Math.min(plan.buses, 2 + (i % 4)),
      };
      store.features[id] = [
        { code: "ONLINE_BOOKING", name: "Réservation en ligne", enabled: true },
        { code: "FLEET", name: "Gestion de flotte", enabled: true },
        { code: "PARCELS", name: "Colis", enabled: i % 3 !== 0 },
        { code: "HR", name: "Ressources humaines", enabled: i % 3 === 2 },
      ];
    }

    store.usage[id] = [
      { metricCode: "bookings_created", label: "Réservations créées", value: 120 + i * 37 },
      { metricCode: "parcels_created", label: "Colis créés", value: 40 + i * 11 },
      { metricCode: "api_calls", label: "Appels API", value: 5000 + i * 850 },
    ];

    store.referrals[id] =
      i < 6
        ? {
            code: `REF-${slug.replace(/-/g, "").slice(0, 8).toUpperCase().padEnd(8, "X")}`,
            credits: [{
              id: uid(5, i + 1), amount: 50000, currency: "XOF",
              status: i % 2 ? "AVAILABLE" : "APPLIED",
            }],
          }
        : { code: null, credits: [] };

    // People (the fleet is seeded by seedFleet, once every company exists)
    const roles: Employee["role"][] = ["MANAGER", "GUICHETIER", "CHAUFFEUR"];
    const peopleCount = status === "draft" ? 1 : 3;
    for (let p = 0; p < peopleCount; p++) {
      const person = PEOPLE[(i + p) % PEOPLE.length]!;
      const email = `${slugify(person)}@${slug}.sn`;
      const phone = `+2217865${String(10000 + i * 211 + p * 17).padStart(5, "0")}`;
      // A draft company has no platform account yet: its accounts are created at activation.
      const userId = status === "draft" ? null : uid(15, userSeq++);
      store.employees.push({ id: uid(6, empSeq++), companyId: id, name: person, email, phone, role: roles[p]!, userId });
      if (userId) {
        store.users.push({
          id: userId, username: `${slugify(person)}.${slug}`, displayName: person, email, phone,
          roleCode: roles[p]!, status: "active", companyId: id, lastLoginAt: null,
          createdAt: iso(-(378 - i * 15)),
        });
      }
    }

    // Activity
    store.activity.push({
      id: uid(9, actSeq++), companyId: id, at: iso(-(400 - i * 15)),
      actor: "system", action: "Compagnie créée",
    });
    if (status !== "draft") {
      store.activity.push({
        id: uid(9, actSeq++), companyId: id, at: iso(-(380 - i * 15)),
        actor: "admin@sira.app", action: "Compagnie activée",
      });
    }
  });

  seedFleet(store, iso);

  PLATFORM_ADMINS.forEach((a, k) => {
    store.users.push({
      id: uid(15, userSeq++), username: a.username, displayName: a.displayName, email: `${a.username}@sira.sn`,
      phone: `+22178659${String(1000 + k * 37).padStart(4, "0")}`, roleCode: "ADMIN", status: a.status,
      companyId: null, lastLoginAt: null, createdAt: iso(-(500 - k * 20)),
    });
  });
  CLIENTS.forEach((c, k) => {
    store.users.push({
      id: uid(15, userSeq++), username: c.username, displayName: c.displayName, email: `${c.username}@client.sn`,
      phone: `+22178659${String(5000 + k * 41).padStart(4, "0")}`, roleCode: "USER", status: c.status,
      companyId: null, lastLoginAt: null, createdAt: iso(-(200 - k * 20)),
    });
  });

  seedSales(store, now, iso);
  seedCustomers(store, iso);
  seedParcels(store, now);
  seedFeedbacks(store, now);
  seedMarketing(store, iso);
  seedNotifications(store);

  // Sessions: 1 to 3 per active account (some revoked, some expired); a suspended account only
  // keeps the session revoked at its suspension. lastLoginAt is the start of the newest session.
  const ip = (u: number, k: number) =>
    `${u % 2 ? "196.207" : "41.82"}.${(u * 7 + k) % 250}.${10 + ((u * 31 + k * 17) % 240)}`;
  store.users.forEach((user, u) => {
    const starts = user.status === "suspended" ? [-(20 + (u % 5))] : Array.from(
      { length: 1 + (u % 3) }, (_, k) => -(k * 3 + (u % 5) + 0.5),
    );
    starts.forEach((start, k) => {
      const revoked = user.status === "suspended" ? start + 1 : k === 1 && u % 4 === 0 ? start + 0.5 : null;
      store.sessions.push({
        id: uid(16, sessionSeq++), userId: user.id, deviceLabel: DEVICES[(u + k) % DEVICES.length]!,
        ipAddress: ip(u, k), createdAt: iso(start), lastSeenAt: iso(start + 0.25),
        expiresAt: iso(start + SESSION_TTL_DAYS),
        revokedAt: revoked === null ? null : iso(revoked),
        revokedReason: revoked === null ? null : user.status === "suspended" ? "Compte suspendu" : "Déconnexion",
      });
    });
    user.lastLoginAt = iso(Math.max(...starts));
  });

  seedDataSubjectRequests(store, iso);
  seedConsents(store, iso);
  seedAuditLogs(store, now, iso);
  seedDataAccessLogs(store, now);
  seedServiceChecks(store, now);
  seedSystemIncidents(store, iso);
  seedApiUsage(store, now);
  seedBackofficeTeam(store, iso);

  return store;
}

/**
 * Fleet of every active company: stations, routes, one fleet, vendors, as many buses as the plan's
 * `usedBuses` (capped by `maxBuses`, never fewer than 2), crew, trips, seat maps and maintenances.
 * Per company, the last bus has no crew (it feeds the "sans conducteur affecté" filter).
 */
function seedFleet(store: Store, iso: (offsetDays: number) => string): void {
  let stationSeq = 1, routeSeq = 1, fleetSeq = 1, vendorSeq = 1, busSeq = 1, crewSeq = 1;
  let tripSeq = 1, seatMapSeq = 1, maintenanceSeq = 1;

  store.companies.forEach((company, i) => {
    if (company.status !== "active") return;
    const id = company.id;

    const stations: Station[] = Array.from({ length: 2 + (i % 3) }, (_, k) => {
      const city = CITIES[(i + k * 3) % CITIES.length]!;
      return { id: uid(17, stationSeq++), companyId: id, name: `Gare routière de ${city}`, city };
    });
    store.stations.push(...stations);

    const routes: Route[] = Array.from({ length: Math.min(stations.length, 2 + (i % 2)) }, (_, r) => {
      const distanceKm = 80 + ((i * 37 + r * 53) % 400);
      return {
        id: uid(18, routeSeq++), companyId: id, originId: stations[r]!.id,
        destinationId: stations[(r + 1) % stations.length]!.id, distanceKm,
        durationMinutes: Math.round(distanceKm * 1.2) + 30,
        status: i % 5 === 4 && r === 1 ? "inactive" : "active",
      };
    });
    store.routes.push(...routes);

    const fleet: Fleet = { id: uid(19, fleetSeq++), companyId: id, name: "Flotte principale", depotId: stations[0]!.id };
    store.fleets.push(fleet);

    const vendors: Vendor[] = VENDORS.slice(0, 1 + (i % 2 === 0 ? 1 : 0)).map((v, k) => ({
      id: uid(20, vendorSeq++), companyId: id,
      name: k === 0 ? `${v.name} ${stations[0]!.city}` : v.name, kind: v.kind,
    }));
    store.vendors.push(...vendors);

    const limits = store.limits[id];
    const busCount = Math.max(2, limits ? Math.min(limits.maxBuses, limits.usedBuses) : 2);

    const crewMember = (role: CrewRole): string => {
      const n = crewSeq++;
      const member: CrewMember = {
        id: uid(23, n), companyId: id, role,
        // Shifting the last name by 3 every 11 members keeps the first 66 names distinct.
        name: `${CREW_FIRST[n % CREW_FIRST.length]} ${CREW_LAST[(n + 3 * Math.floor(n / CREW_FIRST.length)) % CREW_LAST.length]}`,
      };
      store.crew.push(member);
      return member.id;
    };

    for (let b = 0; b < busCount; b++) {
      const model = BUS_MODELS[(i + b) % BUS_MODELS.length]!;
      const last = b === busCount - 1;
      const retired = last && i === RETIRED_COMPANY_INDEX;
      const inMaintenance = b === 0 && i % 4 === 0;
      const route = retired ? null : routes[b % routes.length]!;
      const age = 1 + ((i + b) % 9);
      const gps = b % 2 === 0;
      const bus: Bus = {
        id: uid(7, busSeq++), companyId: id, fleetId: last && i % 3 === 1 ? null : fleet.id,
        busCode: `BUS-${String(i + 1).padStart(2, "0")}${String(b + 1).padStart(2, "0")}`,
        plate: `DK-${1000 + i * 10 + b}-AB`, brand: model.brand, model: model.model, year: 2026 - age,
        busType: model.busType, fuelType: model.fuelType,
        engineNumber: `ENG-${(0x3a000 + i * 211 + b * 17).toString(16).toUpperCase()}`,
        color: COLORS[(i + b) % COLORS.length]!,
        seatCapacity: model.seats, standingCapacity: model.standing, luggageCapacity: model.luggage,
        wheelchairAccessible: b % 3 === 0, airConditioned: b % 4 !== 3,
        gpsEnabled: gps, gpsDeviceId: gps ? `GPS-${String(i + 1).padStart(2, "0")}${b + 1}` : null,
        cameraInstalled: (i + b) % 2 === 0, fuelSensorInstalled: b % 3 !== 2,
        status: retired ? "retired" : inMaintenance ? "maintenance" : "active",
        routeId: route?.id ?? null, depotId: stations[0]!.id,
        driverId: last ? null : crewMember("DRIVER"),
        driverAssistantId: !last && b % 2 === 0 ? crewMember("DRIVER_ASSISTANT") : null,
        controllerId: !last && b % 3 === 0 ? crewMember("CONTROLLER") : null,
        lastMaintenanceDate: iso(-(20 + ((i * 7 + b * 11) % 60))),
        nextMaintenanceDate: iso(10 + ((i * 13 + b * 7) % 80)),
        insuranceExpiry: iso(INSURANCE_DAYS[(i + b) % INSURANCE_DAYS.length]!),
        technicalInspectionExpiry: iso(INSPECTION_DAYS[(i * 2 + b) % INSPECTION_DAYS.length]!),
        registrationExpiry: iso(REGISTRATION_DAYS[(i + b * 3) % REGISTRATION_DAYS.length]!),
        purchaseDate: iso(-365 * age), purchasePrice: model.price,
        retiredAt: retired ? iso(-15) : null,
      };
      store.buses.push(bus);

      // Trips: a retired bus has none; a bus in maintenance only has a past trip.
      if (route) {
        const plan = TRIP_PATTERNS[inMaintenance ? 3 : (i + b) % TRIP_PATTERNS.length]!;
        plan.forEach(({ status, day }, t) => {
          const tripId = uid(8, tripSeq++);
          const rows = Math.ceil(bus.seatCapacity / SEAT_COLUMNS);
          const seats = Array.from({ length: bus.seatCapacity }, (_, k) => ({
            code: `${Math.floor(k / SEAT_COLUMNS) + 1}${"ABCD"[k % SEAT_COLUMNS]}`,
            state: seatState(status, k, t),
          }));
          store.seatMaps.push({
            id: uid(21, seatMapSeq++), companyId: id, busId: bus.id, tripId, rows, columns: SEAT_COLUMNS, seats,
          });
          store.trips.push({
            id: tripId, companyId: id, routeId: route.id, busId: bus.id,
            departure: iso(day), arrival: iso(day + route.durationMinutes / 1440),
            price: Math.round((2000 + route.distanceKm * 25) / 500) * 500, currency: company.currency,
            totalSeats: bus.seatCapacity, availableSeats: seats.filter((x) => x.state === "free").length, status,
          });
        });
      }
    }

    // Maintenances (done by the company's garage, or in-house for the cancelled ones): an in-progress
    // one for each bus in maintenance, a completed and a planned one per company, and a cancelled one
    // for every third company.
    const companyBuses = store.buses.filter((x) => x.companyId === id);
    const maintenance = (busId: string, status: MaintenanceStatus, scheduled: number, k: number) => {
      const n = maintenanceSeq++;
      const kind = MAINTENANCE_TYPES[(i + k) % MAINTENANCE_TYPES.length]!;
      const laborCost = 25_000 + ((i * 13 + k * 7) % 10) * 5_000;
      const partsCost = kind.category === "INSPECTION" ? 0 : 40_000 + ((i * 7 + k * 11) % 12) * 10_000;
      store.maintenances.push({
        id: uid(22, n), companyId: id, busId, vendorId: k === 3 ? null : vendors[0]!.id,
        code: `MNT-${String(1000 + n)}`, type: kind.type, category: kind.category, status,
        scheduledDate: iso(scheduled),
        startedAt: status === "IN_PROGRESS" || status === "COMPLETED" ? iso(scheduled + 0.25) : null,
        completedAt: status === "COMPLETED" ? iso(scheduled + 1) : null,
        laborCost, partsCost, totalCost: laborCost + partsCost,
      });
    };
    for (const bus of companyBuses) if (bus.status === "maintenance") maintenance(bus.id, "IN_PROGRESS", -1, 0);
    maintenance(companyBuses[1]!.id, "COMPLETED", -30, 1);
    maintenance(companyBuses[0]!.id, "PLANNED", 12, 2);
    if (i % 3 === 2) maintenance(companyBuses[1]!.id, "CANCELLED", -8, 3);
  });
}

/** Deterministic seat state: seat 1A is always blocked; the rest depends on the trip status. */
function seatState(status: TripStatus, k: number, t: number): SeatState {
  if (k === 0) return "blocked";
  if (status === "cancelled") return "free";
  if (status === "departed") return k % 5 === 4 ? "free" : "occupied";
  if (status === "boarding") return k % 3 === 0 ? "occupied" : k % 3 === 1 ? "booked" : "free";
  return (k + t) % 3 === 0 ? "booked" : "free";
}

const SCENARIO_NAMES = { cancellable: "Rokhaya Thiaw", inProgress: "Samba Kébé", paid: "Coumba Lô" } as const;
const FAILURE_REASONS = ["Solde insuffisant", "Délai de confirmation dépassé", "Paiement refusé par l'opérateur"];
const CANCEL_REASONS: CancelReason[] = ["EXPIRED", "CLIENT", "PLATFORM"];
/** A trip never gets more than this many seeded bookings, whatever its size. */
const MAX_BOOKINGS_PER_TRIP = 6;
const STUCK_AGES_MINUTES = [3 * 60, 26 * 60];

/** Unique, well-formed code: `prefix` + 8 base-36 characters (Knuth's multiplicative hash is a bijection modulo 2^32). */
function hashCode(prefix: string, n: number): string {
  return prefix + ((n * 2_654_435_761) % 2 ** 32).toString(36).toUpperCase().padStart(8, "0");
}

/**
 * Sales of every trip, derived from its seat map: an `occupied` seat is a paid booking (completed
 * transaction, ticket), a `booked` seat an unpaid one (no transaction, a pending one or a failed one,
 * in rotation); one trip in five also gets a cancelled booking on a free seat. Then four anomalies are
 * planted (two stuck payments, one amount mismatch, one missing ticket) and three scenario passengers named.
 */
function seedSales(store: Store, now: Date, iso: (offsetDays: number) => string): void {
  let methodSeq = 1, bookingSeq = 1, txSeq = 1, ticketSeq = 1;
  const nowMs = now.getTime();
  const ago = (minutes: number) => new Date(nowMs - minutes * 60_000).toISOString();
  const clients = CLIENTS.map((c) => store.users.find((u) => u.username === c.username)!);

  store.companies.forEach((company, i) => {
    if (company.status !== "active") return;
    const methods: [string, PaymentMethodKind, string | null, boolean][] = [
      ["Orange Money", "MOBILE_MONEY", "ORANGE", true],
      ["Wave", "MOBILE_MONEY", "WAVE", i % 4 !== 1],
      ["Espèces au guichet", "CASH", null, true],
    ];
    if (i % 5 === 2) methods.push(["Carte bancaire", "CARD", "VISA", true]);
    for (const [name, kind, provider, active] of methods) {
      store.paymentMethods.push({ id: uid(31, methodSeq++), companyId: company.id, name, kind, provider, active });
    }
  });

  store.trips.forEach((trip, ti) => {
    const map = store.seatMaps.find((m) => m.tripId === trip.id);
    if (!map) return;
    const methods = store.paymentMethods.filter((m) => m.companyId === trip.companyId);
    const mobile = methods.filter((m) => m.kind === "MOBILE_MONEY");
    const cash = methods.find((m) => m.kind === "CASH")!;
    const departure = Date.parse(trip.departure);

    const create = (
      seat: string, channel: BookingChannel, status: BookingStatus, paymentStatus: BookingPaymentStatus,
      createdAt: string, n: number,
    ): Booking => {
      const client = clients[n % clients.length]!;
      const booking: Booking = {
        id: uid(32, bookingSeq), companyId: trip.companyId, tripId: trip.id,
        userId: channel === "online" ? client.id : null,
        passengerName: channel === "online" ? client.displayName : PEOPLE[n % PEOPLE.length]!,
        bookingCode: hashCode("BK-", bookingSeq), seatNumber: seat, status, paymentStatus, channel,
        amount: trip.price, currency: trip.currency, ticketIssued: false,
        createdAt, cancelledAt: null, cancelReason: null,
      };
      bookingSeq++;
      store.bookings.push(booking);
      return booking;
    };
    const transact = (
      b: Booking, methodId: string, status: TransactionStatus,
      createdAt: string, completedAt: string | null, failureReason: string | null,
    ) => {
      store.transactions.push({
        id: uid(33, txSeq), companyId: b.companyId, bookingId: b.id, paymentMethodId: methodId,
        reference: hashCode("TX-", txSeq), amount: b.amount, currency: b.currency, status, failureReason,
        createdAt, completedAt,
      });
      txSeq++;
    };
    const issue = (b: Booking, status: TicketStatus, issuedAt: string, scans: string[]) => {
      b.ticketIssued = true;
      store.tickets.push({
        id: uid(34, ticketSeq), companyId: b.companyId, bookingId: b.id, tripId: b.tripId,
        ticketCode: hashCode("TK-", ticketSeq), seatNumber: b.seatNumber, status, issuedAt, scans,
      });
      ticketSeq++;
    };

    const claimed = map.seats
      .filter((x) => x.state === "booked" || x.state === "occupied")
      .slice(0, MAX_BOOKINGS_PER_TRIP);
    let paidCount = 0;
    claimed.forEach((seat, j) => {
      const n = ti * 10 + j;
      const channel: BookingChannel = (ti + j) % 3 === 0 ? "counter" : "online";
      const method = channel === "online" ? mobile[n % mobile.length]! : cash;
      if (seat.state === "occupied") {
        const created = new Date(departure - (2 + (n % 4)) * 86_400_000).toISOString();
        const paidAt = new Date(Date.parse(created) + 3 * 60_000).toISOString();
        const b = create(seat.code, channel, "confirmed", "paid", created, n);
        transact(b, method.id, "COMPLETED", created, paidAt, null);
        if (trip.status === "departed") issue(b, "USED", paidAt, [new Date(departure - 40 * 60_000).toISOString()]);
        else if (paidCount++ % 2 === 0) issue(b, "CHECKED_IN", paidAt, [ago(20)]);
        else issue(b, "ISSUED", paidAt, []);
        return;
      }
      const minutes = 2 + (n % 8);
      const created = ago(minutes + 1);
      const kind = j % 3;
      if (kind === 0) {
        create(seat.code, channel, "confirmed", "pending", created, n);
      } else if (kind === 1) {
        const b = create(seat.code, channel, "confirmed", "pending", created, n);
        transact(b, method.id, "PENDING", ago(minutes), null, null);
      } else {
        const b = create(seat.code, channel, "confirmed", "failed", created, n);
        transact(b, method.id, "FAILED", ago(minutes), ago(minutes - 1), FAILURE_REASONS[n % FAILURE_REASONS.length]!);
      }
    });

    if (ti % 5 === 0) {
      const free = map.seats.find((x) => x.state === "free");
      if (free) {
        const n = ti * 10 + 9;
        const reason = CANCEL_REASONS[(ti / 5) % CANCEL_REASONS.length]!;
        const createdMs = Math.min(departure - 3 * 86_400_000, nowMs - 3 * 3_600_000);
        const b = create(free.code, reason === "PLATFORM" ? "counter" : "online", "cancelled", "pending", new Date(createdMs).toISOString(), n);
        b.cancelReason = reason;
        b.cancelledAt = new Date(createdMs + (reason === "EXPIRED" ? 30 : 120) * 60_000).toISOString();
      }
    }
  });

  // Anomalies: the first two pending payments are stuck, the second completed one has the wrong amount,
  // the third completed one has lost its ticket.
  const bookingOf = (id: string) => store.bookings.find((b) => b.id === id)!;
  const pendingTx = store.transactions.filter((t) => t.status === "PENDING");
  STUCK_AGES_MINUTES.forEach((minutes, k) => {
    const t = pendingTx[k]!;
    t.createdAt = ago(minutes);
    bookingOf(t.bookingId).createdAt = ago(minutes + 1);
  });
  const completed = store.transactions.filter((t) => t.status === "COMPLETED");
  completed[1]!.amount -= 500;
  const orphan = bookingOf(completed[2]!.bookingId);
  orphan.ticketIssued = false;
  store.tickets = store.tickets.filter((t) => t.bookingId !== orphan.id);

  // Scenario passengers (counter bookings): one cancellable, one with a payment in progress, one paid.
  const txsOf = (id: string) => store.transactions.filter((t) => t.bookingId === id);
  const counter = store.bookings.filter((b) => b.channel === "counter" && b.status === "confirmed");
  counter.find((b) => b.paymentStatus === "pending" && txsOf(b.id).length === 0)!.passengerName = SCENARIO_NAMES.cancellable;
  counter.find((b) =>
    b.paymentStatus === "pending"
    && txsOf(b.id).some((t) => t.status === "PENDING" && Date.parse(t.createdAt) > nowMs - 30 * 60_000),
  )!.passengerName = SCENARIO_NAMES.inProgress;
  counter.find((b) =>
    b.paymentStatus === "paid" && b.ticketIssued && txsOf(b.id).every((t) => t.amount === b.amount),
  )!.passengerName = SCENARIO_NAMES.paid;
}

const MEMBERSHIPS: MembershipType[] = ["REGULAR", "VIP", "PREMIUM"];

/**
 * Customers (one per client account), loyalty programs for the first eight active companies (one inactive),
 * loyalty accounts and point movements derived from the customers' paid online bookings, and three sponsorships.
 */
function seedCustomers(store: Store, iso: (offsetDays: number) => string): void {
  let customerSeq = 1, programSeq = 1, accountSeq = 1, movementSeq = 1, sponsorSeq = 1;

  const customers = CLIENTS.map((c, k) => {
    const user = store.users.find((u) => u.username === c.username)!;
    const customer: Customer = {
      id: uid(44, customerSeq++), userId: user.id, name: user.displayName, isCorporate: k === CLIENTS.length - 1,
      sponsorshipId: null, sponsoredAt: null, createdAt: user.createdAt,
    };
    store.customers.push(customer);
    return customer;
  });

  const activeCompanies = store.companies.filter((c) => c.status === "active");
  activeCompanies.slice(0, 8).forEach((company, k) => {
    store.loyaltyPrograms.push({
      id: uid(45, programSeq++), companyId: company.id, name: `Fidélité ${company.name}`,
      pointsPerCurrencyUnit: 0.01, redemptionRate: 5, minPointsForRedemption: 1000,
      status: k === 5 ? "INACTIVE" : "ACTIVE", createdAt: iso(-(300 - k * 20)),
    });
  });

  const paidOnline = store.bookings
    .filter((b) => b.channel === "online" && b.status === "confirmed" && b.paymentStatus === "paid")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  for (const booking of paidOnline) {
    const customer = customers.find((c) => c.userId === booking.userId);
    const program = store.loyaltyPrograms.find((p) => p.companyId === booking.companyId && p.status === "ACTIVE");
    if (!customer || !program) continue;
    let account = store.loyaltyAccounts.find((a) => a.customerId === customer.id && a.companyId === booking.companyId);
    if (!account) {
      account = {
        id: uid(46, accountSeq), customerId: customer.id, companyId: booking.companyId, points: 0,
        membershipType: MEMBERSHIPS[accountSeq % MEMBERSHIPS.length]!, createdAt: booking.createdAt,
      };
      accountSeq++;
      store.loyaltyAccounts.push(account);
    }
    const points = Math.floor(booking.amount * program.pointsPerCurrencyUnit);
    account.points += points;
    store.loyaltyTransactions.push({
      id: uid(47, movementSeq++), accountId: account.id, bookingId: booking.id, points, createdAt: booking.createdAt,
    });
  }

  const sponsor = (
    companyIndex: number, who: Customer, status: SponsorshipStatus, rewardType: SponsorshipRewardType,
    rewardValue: number, createdDays: number, expiresDays: number,
  ): Sponsorship => {
    const sponsorship: Sponsorship = {
      id: uid(48, sponsorSeq), companyId: activeCompanies[companyIndex]!.id, sponsorCustomerId: who.id,
      code: hashCode("SPN-", sponsorSeq), rewardType, rewardValue, status,
      createdAt: iso(createdDays), expiresAt: iso(expiresDays),
    };
    sponsorSeq++;
    store.sponsorships.push(sponsorship);
    return sponsorship;
  };
  sponsor(0, customers[0]!, "ACTIVE", "LOYALTY_POINTS", 500, -20, 70);
  const redeemed = sponsor(0, customers[0]!, "REDEEMED", "LOYALTY_POINTS", 500, -60, 30);
  sponsor(1, customers[1]!, "EXPIRED", "DISCOUNT", 10, -120, -30);
  customers[2]!.sponsorshipId = redeemed.id;
  customers[2]!.sponsoredAt = iso(-45);
}

const RECIPIENTS = [
  "Mame Diarra Sène", "Tidiane Cissokho", "Fama Badiane", "Elhadji Sakho",
  "Soda Mendy", "Moctar Dème", "Aby Tounkara", "Bakary Konaté",
];
const PARCEL_SCENARIOS = { lostable: "Dior Kébé", pending: "Gorgui Sall", closed: "Yacine Ndoye" } as const;
const PARCEL_TYPES: ParcelType[] = ["DOCUMENT", "PACKAGE", "FRAGILE", "PERISHABLE", "OTHER"];
const PARCEL_DESCRIPTIONS = [
  "Dossiers administratifs", "Pièces détachées", "Verres en cristal", "Produits frais", "Vêtements", "Matériel informatique",
];
const DEPARTED_STATUSES: ParcelStatus[] = ["DELIVERED", "DELIVERED", "IN_TRANSIT", "AT_HUB", "LOST", "RETURNED"];
const PARCEL_PATHS: Record<ParcelStatus, ParcelStatus[]> = {
  PENDING: ["PENDING"], IN_TRANSIT: ["PENDING", "IN_TRANSIT"], AT_HUB: ["PENDING", "IN_TRANSIT", "AT_HUB"],
  DELIVERED: ["PENDING", "IN_TRANSIT", "DELIVERED"], LOST: ["PENDING", "IN_TRANSIT", "LOST"],
  RETURNED: ["PENDING", "IN_TRANSIT", "RETURNED"], CANCELLED: ["PENDING", "CANCELLED"],
};
const HUB_PATH: ParcelStatus[] = ["PENDING", "IN_TRANSIT", "AT_HUB", "IN_TRANSIT", "DELIVERED"];

/**
 * Parcels of every trip (more on departed trips so all seven statuses appear), each with its legs and a status
 * history that ends at its current status; some delivered parcels went through a hub (two legs).
 */
function seedParcels(store: Store, now: Date): void {
  let parcelSeq = 1, legSeq = 1, historySeq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;

  store.trips.forEach((trip, ti) => {
    const route = store.routes.find((r) => r.id === trip.routeId);
    if (!route) return;
    const count = trip.status === "departed" ? 2 + (ti % 2) : ti % 3;
    const departure = Date.parse(trip.departure);
    for (let j = 0; j < count; j++) {
      const n = ti * 10 + j;
      const status: ParcelStatus =
        trip.status === "cancelled" ? "CANCELLED"
        : trip.status === "planned" ? "PENDING"
        : trip.status === "boarding" ? (j % 2 === 0 ? "PENDING" : "IN_TRANSIT")
        : DEPARTED_STATUSES[(ti + j) % DEPARTED_STATUSES.length]!;
      const secondTrip = store.trips.find((t) => t.companyId === trip.companyId && t.id !== trip.id);
      const hub = status === "DELIVERED" && j === 0 && ti % 4 === 0 && secondTrip !== undefined;
      const path = hub ? HUB_PATH : PARCEL_PATHS[status];
      const customer = j % 2 === 0 ? store.customers[n % store.customers.length]! : null;
      const weightKg = 1 + (n % 9) * 2.5;
      const createdMs = Math.min(departure - 2 * DAY_MS, nowMs - 3_600_000);
      const parcel: Parcel = {
        id: uid(41, parcelSeq), companyId: trip.companyId, parcelCode: hashCode("PCL-", parcelSeq),
        trackingNumber: hashCode("TRK-", parcelSeq),
        senderName: customer ? customer.name : PEOPLE[n % PEOPLE.length]!, senderCustomerId: customer?.id ?? null,
        recipientName: RECIPIENTS[n % RECIPIENTS.length]!,
        recipientPhone: `+2217713${String(10_000 + ((n * 37) % 80_000)).padStart(5, "0")}`,
        weightKg, parcelType: PARCEL_TYPES[n % PARCEL_TYPES.length]!,
        description: PARCEL_DESCRIPTIONS[n % PARCEL_DESCRIPTIONS.length]!,
        tripId: trip.id, originStationId: route.originId, destinationStationId: route.destinationId,
        pickupAt: new Date(departure - 3_600_000).toISOString(), expectedDeliveryAt: trip.arrival,
        actualDeliveryAt: status === "DELIVERED" ? new Date(Date.parse(trip.arrival) + 1_800_000).toISOString() : null,
        status, shippingFee: Math.round((1500 + weightKg * 200) / 100) * 100, currency: trip.currency,
        paymentStatus: status === "CANCELLED" ? "REFUNDED" : status === "PENDING" ? "PENDING" : "PAID",
        createdAt: new Date(createdMs).toISOString(),
      };
      parcelSeq++;
      store.parcels.push(parcel);

      store.parcelLegs.push({
        id: uid(42, legSeq), parcelId: parcel.id, companyId: parcel.companyId, tripId: trip.id,
        assignmentCode: hashCode("ASG-", legSeq), sequence: 1,
      });
      legSeq++;
      if (hub) {
        store.parcelLegs.push({
          id: uid(42, legSeq), parcelId: parcel.id, companyId: parcel.companyId, tripId: secondTrip.id,
          assignmentCode: hashCode("ASG-", legSeq), sequence: 2,
        });
        legSeq++;
      }

      path.forEach((newStatus, k) => {
        store.parcelHistory.push({
          id: uid(43, historySeq++), parcelId: parcel.id, previousStatus: k === 0 ? null : path[k - 1]!, newStatus,
          notes: null, changedBy: k === 0 ? null : "Équipe de la compagnie",
          changedAt: new Date(createdMs + k * 1_800_000).toISOString(),
        });
      });
    }
  });

  store.parcels.find((p) => p.status === "IN_TRANSIT")!.recipientName = PARCEL_SCENARIOS.lostable;
  store.parcels.find((p) => p.status === "PENDING")!.recipientName = PARCEL_SCENARIOS.pending;
  store.parcels.find((p) => p.status === "DELIVERED")!.recipientName = PARCEL_SCENARIOS.closed;
}

const FEEDBACK_SCENARIOS = {
  ignorable: "Climatisation en panne pendant le trajet", resolved: "Service impeccable au guichet",
} as const;
const FEEDBACK_STATUS_CYCLE: FeedbackStatus[] = ["PENDING", "PENDING", "REVIEWED", "RESOLVED", "IGNORED"];
const FEEDBACK_RATINGS = [5, 4, 2, 1, 3];
const FEEDBACK_TITLES: Record<"TRIP" | "PARCEL" | "SERVICE", string[]> = {
  TRIP: ["Départ en retard", "Trajet confortable", "Bus très propre", "Arrêt trop long", "Chauffeur courtois"],
  PARCEL: ["Colis bien arrivé", "Colis livré en retard"],
  SERVICE: ["Accueil au guichet", "Application de réservation"],
};

/** Reviews of every customer: one per paid booking (four at most), one for their first parcel, one on the service. */
function seedFeedbacks(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;

  const add = (
    customer: Customer, companyId: string, feedbackType: "TRIP" | "PARCEL" | "SERVICE",
    refs: { tripId?: string; parcelId?: string; bookingId?: string }, baseIso: string,
  ) => {
    const n = seq++;
    const status = FEEDBACK_STATUS_CYCLE[n % FEEDBACK_STATUS_CYCLE.length]!;
    const createdMs = Math.min(Date.parse(baseIso) + 2 * DAY_MS, nowMs - 3_600_000);
    const titles = FEEDBACK_TITLES[feedbackType];
    store.feedbacks.push({
      id: uid(49, n), companyId, customerId: customer.id,
      tripId: refs.tripId ?? null, parcelId: refs.parcelId ?? null, bookingId: refs.bookingId ?? null,
      rating: FEEDBACK_RATINGS[(n * 3) % FEEDBACK_RATINGS.length]!, feedbackType,
      title: titles[n % titles.length]!, comment: "Retour d'expérience détaillé du client sur ce service.",
      status,
      response: status === "RESOLVED" ? "Merci pour votre retour, nous en avons tenu compte." : null,
      respondedAt: status === "RESOLVED" ? new Date(Math.min(createdMs + DAY_MS, nowMs)).toISOString() : null,
      createdAt: new Date(createdMs).toISOString(),
    });
  };

  for (const customer of store.customers) {
    const paid = store.bookings
      .filter((b) => b.userId === customer.userId && b.paymentStatus === "paid")
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .slice(0, 4);
    for (const b of paid) add(customer, b.companyId, "TRIP", { tripId: b.tripId, bookingId: b.id }, b.createdAt);
    const parcel = store.parcels.find((p) => p.senderCustomerId === customer.id);
    if (parcel) add(customer, parcel.companyId, "PARCEL", { parcelId: parcel.id, tripId: parcel.tripId }, parcel.createdAt);
    if (paid[0]) add(customer, paid[0].companyId, "SERVICE", {}, paid[0].createdAt);
  }

  store.feedbacks.find((f) => f.status === "PENDING")!.title = FEEDBACK_SCENARIOS.ignorable;
  store.feedbacks.find((f) => f.status === "RESOLVED")!.title = FEEDBACK_SCENARIOS.resolved;
}

const MARKETING_SCENARIOS = {
  tabaski: "Offre de la Tabaski", yearEnd: "Offre de fin d'année", cancelled: "Campagne d'été annulée", completed: "Bilan de rentrée",
} as const;

/**
 * Same targeting as `customer-service`'s dispatcher: only `membershipType` is evaluated (case-insensitive) over the
 * company's loyalty accounts; no rule targets every account; an unknown tier targets nobody.
 */
function eligibleCount(store: Store, companyId: string, criteria: Record<string, string>): number {
  const accounts = store.loyaltyAccounts.filter((a) => a.companyId === companyId);
  const wanted = criteria.membershipType;
  return wanted === undefined ? accounts.length : accounts.filter((a) => a.membershipType === wanted.toUpperCase()).length;
}

/**
 * Campaigns of the first four companies with an active loyalty program: a scheduled campaign (a sent and a pending
 * schedule), a cancelled one (cancelled schedule, reusable segment); the first company also has a year-end campaign
 * (pending schedule) and a completed one; the others a draft campaign targeting an unknown tier.
 */
function seedMarketing(store: Store, iso: (offsetDays: number) => string): void {
  let campaignSeq = 1, segmentSeq = 1, messageSeq = 1, scheduleSeq = 1;
  const S = MARKETING_SCENARIOS;
  const companyIds = store.loyaltyPrograms.filter((p) => p.status === "ACTIVE").slice(0, 4).map((p) => p.companyId);

  companyIds.forEach((companyId, k) => {
    const company = store.companies.find((c) => c.id === companyId)!;
    const creator = store.users.find((u) => u.companyId === companyId);

    const campaign = (
      name: string, objective: CampaignObjective, status: CampaignStatus, startDays: number, endDays: number, budget: number,
    ): MarketingCampaign => {
      const c: MarketingCampaign = {
        id: uid(52, campaignSeq++), companyId, name, objective, status, startDate: iso(startDays), endDate: iso(endDays),
        budget, currency: company.currency, createdByUserId: creator?.id ?? null, createdAt: iso(startDays - 10),
        updatedAt: status === "CANCELLED" ? iso(-2) : null,
      };
      store.marketingCampaigns.push(c);
      return c;
    };
    const segment = (campaignId: string | null, name: string, criteria: Record<string, string>, estimatedSize: number): MarketingSegment => {
      const seg: MarketingSegment = {
        id: uid(53, segmentSeq++), companyId, campaignId, name, criteria, estimatedSize, createdAt: iso(-12),
      };
      store.marketingSegments.push(seg);
      return seg;
    };
    const message = (
      campaignId: string, channel: NotificationChannel, subject: string, content: string, status: MarketingMessageStatus,
    ): MarketingMessage => {
      const m: MarketingMessage = {
        id: uid(54, messageSeq++), companyId, campaignId, channel, subject, content, status, createdAt: iso(-11),
      };
      store.marketingMessages.push(m);
      return m;
    };
    const schedule = (
      c: MarketingCampaign, m: MarketingMessage, seg: MarketingSegment, status: ScheduleStatus, days: number,
    ): void => {
      const scheduledAt = iso(days);
      store.marketingSchedules.push({
        id: uid(55, scheduleSeq++), companyId, campaignId: c.id, messageId: m.id, segmentId: seg.id, scheduledAt,
        sentAt: status === "SENT" ? new Date(Date.parse(scheduledAt) + 60_000).toISOString() : null, status,
        recipientsCount: status === "SENT" ? eligibleCount(store, companyId, seg.criteria) : 0,
        createdAt: iso(Math.min(days, 0) - 1),
      });
    };

    // Scheduled campaign: a schedule already sent and one still pending.
    const scheduled = campaign(
      k === 0 ? S.tabaski : `Promotion VIP ${company.name}`, "PROMOTION", "SCHEDULED", -5, 20, 250_000 + k * 50_000,
    );
    const vip = segment(scheduled.id, `VIP ${company.name}`, { membershipType: "vip" }, 12 + k * 3);
    const promo = message(scheduled.id, "IN_APP", scheduled.name, "Profitez de -20 % sur votre prochain trajet.", "APPROVED");
    schedule(scheduled, promo, vip, "SENT", -3);
    schedule(scheduled, promo, vip, "PENDING", 2);

    if (k === 0) {
      const yearEnd = campaign(S.yearEnd, "RETENTION", "SCHEDULED", -2, 30, 120_000);
      const everyone = segment(yearEnd.id, `Tous les clients ${company.name}`, {}, 40);
      const m = message(yearEnd.id, "IN_APP", yearEnd.name, "Voyagez en fin d'année avec 15 % de réduction.", "APPROVED");
      schedule(yearEnd, m, everyone, "PENDING", 10);
    } else {
      const draft = campaign(`Réactivation ${company.name}`, "REACTIVATION", "DRAFT", 5, 40, 80_000);
      segment(draft.id, `Palier gold ${company.name}`, { membershipType: "gold", lastBookingDays: "90" }, 8);
      message(draft.id, "EMAIL", `Nous vous attendons chez ${company.name}`, "Revenez voyager, une surprise vous attend.", "DRAFT");
    }

    // Cancelled campaign: its schedule was cancelled with it; its segment is reusable.
    const cancelled = campaign(k === 0 ? S.cancelled : `Campagne annulée ${company.name}`, "ACQUISITION", "CANCELLED", -15, -1, 60_000);
    const reusable = segment(null, `Nouveaux clients ${company.name}`, {}, 25);
    const cancelledMessage = message(cancelled.id, "IN_APP", cancelled.name, "Découvrez nos nouvelles lignes.", "APPROVED");
    schedule(cancelled, cancelledMessage, reusable, "CANCELLED", 5);

    if (k === 0) {
      const done = campaign(S.completed, "PROMOTION", "COMPLETED", -40, -10, 200_000);
      const premium = segment(done.id, `Clients premium ${company.name}`, { membershipType: "premium" }, 6);
      const doneMessage = message(done.id, "IN_APP", done.name, "Merci pour votre fidélité : bilan et avantages.", "SENT");
      schedule(done, doneMessage, premium, "SENT", -20);
    }
  });
}

const PARCEL_STATUS_TEXT: Record<ParcelStatus, string> = {
  PENDING: "enregistré", IN_TRANSIT: "en transit", AT_HUB: "arrivé au hub", DELIVERED: "livré",
  CANCELLED: "annulé", RETURNED: "retourné", LOST: "déclaré perdu",
};
const BOOKING_CHANNELS: NotificationChannel[] = ["EMAIL", "SMS", "IN_APP"];

/**
 * Notifications derived from the other domains: three channels for the confirmation and the cancellation of an
 * online booking, one in-app notification for a confirmed payment, one SMS per parcel history line (the recipient
 * has no account), one in-app notification per resolved review and per recipient of a sent marketing schedule.
 * An expired booking sends nothing (as in the backend). One e-mail in fifteen has failed, one SMS in forty is pending.
 */
function seedNotifications(store: Store): void {
  let seq = 1;

  const push = (
    companyId: string, entityType: string, entityId: string, notificationType: string, sentTo: string | null,
    channel: NotificationChannel, messageContent: string, createdAt: string,
  ): void => {
    const n = seq++;
    const status: NotificationStatus =
      channel === "EMAIL" && n % 15 === 0 ? "FAILED" : channel === "SMS" && n % 40 === 0 ? "PENDING" : "SENT";
    store.notifications.push({
      id: uid(51, n), companyId, entityType, entityId, notificationCode: hashCode("NTF-", n), notificationType, sentTo,
      channel, status, scheduledAt: null,
      sentAt: status === "SENT" ? new Date(Date.parse(createdAt) + 2_000).toISOString() : null,
      retryCount: 0, read: channel === "IN_APP" && status === "SENT" && n % 3 === 0, messageContent, createdAt,
    });
  };

  for (const b of store.bookings.filter((x) => x.channel === "online" && x.userId)) {
    for (const channel of BOOKING_CHANNELS) {
      push(b.companyId, "booking", b.id, "booking_confirmed", b.userId, channel,
        `Réservation ${b.bookingCode} confirmée, siège ${b.seatNumber ?? "—"}.`, b.createdAt);
    }
    if (b.paymentStatus === "paid") {
      push(b.companyId, "booking", b.id, "payment_completed", b.userId, "IN_APP",
        `Paiement reçu pour la réservation ${b.bookingCode}.`, new Date(Date.parse(b.createdAt) + 180_000).toISOString());
    }
    if (b.status === "cancelled" && b.cancelReason !== "EXPIRED" && b.cancelledAt) {
      for (const channel of BOOKING_CHANNELS) {
        push(b.companyId, "booking", b.id, "booking_cancelled", b.userId, channel,
          `Réservation ${b.bookingCode} annulée.`, b.cancelledAt);
      }
    }
  }

  for (const p of store.parcels) {
    for (const h of store.parcelHistory.filter((x) => x.parcelId === p.id)) {
      push(p.companyId, "parcel", p.id, h.previousStatus === null ? "parcel_created" : `parcel_status_${h.newStatus.toLowerCase()}`,
        null, "SMS", `Colis ${p.parcelCode} : ${PARCEL_STATUS_TEXT[h.newStatus]}.`, h.changedAt);
    }
  }

  for (const f of store.feedbacks.filter((x) => x.status === "RESOLVED" && x.respondedAt)) {
    const customer = store.customers.find((c) => c.id === f.customerId)!;
    push(f.companyId, "feedback", f.id, "feedback_response", customer.userId, "IN_APP",
      "La compagnie a répondu à votre avis.", f.respondedAt!);
  }

  for (const sc of store.marketingSchedules.filter((x) => x.status === "SENT")) {
    const segment = store.marketingSegments.find((x) => x.id === sc.segmentId)!;
    const message = store.marketingMessages.find((x) => x.id === sc.messageId)!;
    const wanted = segment.criteria.membershipType;
    const accounts = store.loyaltyAccounts.filter((a) =>
      a.companyId === sc.companyId && (wanted === undefined || a.membershipType === wanted.toUpperCase()));
    for (const a of accounts) {
      const customer = store.customers.find((c) => c.id === a.customerId)!;
      push(sc.companyId, "marketing_schedule", sc.id, "marketing_message", customer.userId, "IN_APP", message.content, sc.sentAt!);
    }
  }

  // Keep the log chronological for readers of the raw store; consumers sort anyway.
  store.notifications.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/**
 * Ten data-subject requests: four statuses, six types, one open request past its deadline. The five scenario
 * requests use unique (requester, type) pairs among the client accounts.
 */
function seedDataSubjectRequests(store: Store, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const client = (displayName: string) => store.users.find((u) => u.displayName === displayName && u.roleCode === "USER" && u.companyId === null)!;
  const staff = store.users.filter((u) => u.companyId !== null);

  interface Def {
    who: PlatformUser; type: DsrType; status: DsrStatus; createdDays: number; reason: string;
    resolvedDays?: number; notes?: string;
  }
  const defs: Def[] = [
    { who: client("Ndèye Diouf"), type: "ACCESS", status: "RECEIVED", createdDays: -10, reason: "Je souhaite obtenir une copie de mes données personnelles." },
    { who: client("Lamine Camara"), type: "ERASURE", status: "IN_PROGRESS", createdDays: -27, reason: "Je demande la suppression de mon compte entreprise." },
    { who: client("Aïssatou Sarr"), type: "OBJECTION", status: "IN_PROGRESS", createdDays: -20, reason: "Je m'oppose à l'usage de mes données à des fins commerciales." },
    { who: client("Pape Mbaye"), type: "RECTIFICATION", status: "RECEIVED", createdDays: -32, reason: "Mon nom est mal orthographié sur mes billets." },
    { who: client("Aïssatou Sarr"), type: "PORTABILITY", status: "COMPLETED", createdDays: -50, resolvedDays: -30, reason: "Je veux récupérer mes données dans un format lisible.", notes: "Export transmis au demandeur." },
    { who: client("Pape Mbaye"), type: "RESTRICTION", status: "RECEIVED", createdDays: -5, reason: "Je demande la limitation du traitement de mes données le temps d'une vérification." },
    { who: client("Ndèye Diouf"), type: "ERASURE", status: "COMPLETED", createdDays: -60, resolvedDays: -35, reason: "Je demande l'effacement de mon ancien compte.", notes: "Données effacées, journaux d'audit conservés." },
    { who: client("Lamine Camara"), type: "ACCESS", status: "REJECTED", createdDays: -45, resolvedDays: -40, reason: "Je demande l'accès aux données d'un tiers.", notes: "Identité du demandeur non vérifiée." },
    { who: staff[0]!, type: "ACCESS", status: "COMPLETED", createdDays: -40, resolvedDays: -25, reason: "Je demande l'accès à ma fiche employé.", notes: "Copie transmise par la compagnie." },
    { who: staff[1]!, type: "PORTABILITY", status: "RECEIVED", createdDays: -8, reason: "Je souhaite transférer mes données vers un autre service." },
  ];

  for (const d of defs) {
    store.dataSubjectRequests.push({
      id: uid(61, seq++), requesterUserId: d.who.id, companyId: d.who.companyId, requestType: d.type, status: d.status,
      reason: d.reason, handledBy: d.status === "RECEIVED" ? null : "admin",
      dueDate: iso(d.createdDays + 30), resolvedAt: d.resolvedDays === undefined ? null : iso(d.resolvedDays),
      resolutionNotes: d.notes ?? null, createdAt: iso(d.createdDays),
    });
  }
}

const DEFAULT_RETENTION_DAYS = 730;

/** Consent history of the client accounts (append-only rows), plus a cookie consent for three employees. */
function seedConsents(store: Store, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const record = (
    userId: string, consentType: ConsentType, companyId: string | null, status: ConsentStatus,
    source: ConsentSource, days: number, consentVersion = "v1.1",
  ): void => {
    store.consentRecords.push({
      id: uid(62, seq++), userId, consentType, companyId, status, consentVersion, source,
      grantedAt: status === "GRANTED" ? iso(days) : null, withdrawnAt: status === "WITHDRAWN" ? iso(days) : null,
      createdAt: iso(days),
    });
  };
  const clients = store.users.filter((u) => u.roleCode === "USER" && u.companyId === null);
  const companyIds = store.loyaltyPrograms.map((p) => p.companyId);

  clients.forEach((u, k) => {
    record(u.id, "COOKIES_ANALYTICS", null, "GRANTED", "SIGNUP", -(180 - k * 10), "v1.0");
    record(u.id, "GEOLOCATION", null, "GRANTED", "SETTINGS_PAGE", -(150 - k * 10));
    if (k % 2 === 0) record(u.id, "GEOLOCATION", null, "WITHDRAWN", "SETTINGS_PAGE", -(40 + k));
    const emailCompany = companyIds[k % companyIds.length]!;
    record(u.id, "MARKETING_EMAIL", emailCompany, "GRANTED", "BOOKING_FLOW", -(100 - k));
    if (k % 3 === 1) record(u.id, "MARKETING_EMAIL", emailCompany, "WITHDRAWN", "SETTINGS_PAGE", -20);
    record(u.id, "MARKETING_SMS", companyIds[(k + 1) % companyIds.length]!, "GRANTED", "SETTINGS_PAGE", -(60 - k));
    if (k === 0) record(u.id, "MARKETING_EMAIL", null, "GRANTED", "SIGNUP", -400, "v1.0");
    if (k === 3) record(u.id, "DATA_SHARING_PARTNERS", null, "GRANTED", "SETTINGS_PAGE", -30);
    if (k === 1 || k === 2) record(u.id, "DATA_SHARING_PARTNERS", null, "GRANTED", "BOOKING_FLOW", -(25 + k));
  });
  store.users.filter((u) => u.companyId !== null).slice(0, 3).forEach((u, k) => {
    record(u.id, "COOKIES_ANALYTICS", null, "GRANTED", "SIGNUP", -(90 - k * 5));
  });
}

/**
 * Audit trail derived from the other domains (company creation and activation, logins, bookings, parcel status
 * changes, three subscription history lines per active company, admin role grants), then anonymised the way the
 * daily retention job would have: a company line older than the company's retention loses its IP and user agent.
 */
function seedAuditLogs(store: Store, now: Date, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;
  const admin = store.users.find((u) => u.roleCode === "ADMIN" && u.status === "active")!;
  const originOf = (userId: string) => {
    const session = store.sessions.find((x) => x.userId === userId);
    return { ipAddress: session?.ipAddress ?? "196.207.12.40", userAgent: session?.deviceLabel ?? "Chrome · Windows" };
  };
  const noOrigin = { ipAddress: null, userAgent: null };
  const staffOf = (companyId: string) => store.users.find((u) => u.companyId === companyId) ?? null;
  const add = (row: Omit<AuditLog, "id" | "occurredAt" | "actorLabel">): void => {
    store.auditLogs.push({ id: uid(63, seq++), actorLabel: null, occurredAt: row.createdAt, ...row });
  };

  for (const c of store.companies) {
    add({
      companyId: c.id, actorUserId: admin.id, actorType: "USER", action: "CREATE", entityType: "Company", entityId: c.id,
      beforeState: null, afterState: { status: "DRAFT" }, ...originOf(admin.id), sourceService: "company-service",
      createdAt: c.createdAt,
    });
    if (c.activatedAt) {
      add({
        companyId: c.id, actorUserId: c.forceActivated ? admin.id : null, actorType: c.forceActivated ? "USER" : "SYSTEM",
        action: "UPDATE", entityType: "Company", entityId: c.id,
        beforeState: { status: "DRAFT", forceActivated: "false" },
        afterState: { status: "ACTIVE", forceActivated: String(c.forceActivated) },
        ...(c.forceActivated ? originOf(admin.id) : noOrigin), sourceService: "company-service", createdAt: c.activatedAt,
      });
    }
  }

  for (const c of store.companies.filter((x) => x.status === "active")) {
    const subscription = store.subscriptions.find((s) => s.companyId === c.id);
    const born = Date.parse(c.createdAt);
    const age = nowMs - born;
    const steps: [number, Record<string, string>, Record<string, string>][] = [
      [0.2, { status: "TRIAL" }, { status: "ACTIVE" }],
      [0.5, { billingCycle: "MONTHLY" }, { billingCycle: "YEARLY" }],
      [0.8, { billingCycle: "YEARLY" }, { billingCycle: "MONTHLY" }],
    ];
    for (const [fraction, beforeState, afterState] of steps) {
      add({
        companyId: c.id, actorUserId: admin.id, actorType: "USER", action: "UPDATE", entityType: "CompanySubscription",
        entityId: subscription?.id ?? c.id, beforeState, afterState, ...originOf(admin.id),
        sourceService: "company-service", createdAt: new Date(born + age * fraction).toISOString(),
      });
    }
  }

  for (const session of store.sessions) {
    const user = store.users.find((u) => u.id === session.userId);
    add({
      companyId: user?.companyId ?? null, actorUserId: session.userId, actorType: "USER", action: "LOGIN",
      entityType: "User", entityId: session.userId, beforeState: null, afterState: null,
      ipAddress: session.ipAddress, userAgent: session.deviceLabel, sourceService: "identity-service",
      createdAt: session.createdAt,
    });
  }
  for (const u of store.users.filter((x) => x.status === "suspended")) {
    add({
      companyId: u.companyId, actorUserId: null, actorType: "SYSTEM", action: "LOGIN_FAILED", entityType: "User",
      entityId: u.id, beforeState: null, afterState: { reason: "ACCOUNT_NOT_ACTIVE" }, ...originOf(u.id),
      sourceService: "identity-service", createdAt: iso(-3),
    });
  }
  for (const u of store.users.filter((x) => x.roleCode === "ADMIN")) {
    add({
      companyId: null, actorUserId: null, actorType: "SYSTEM", action: "PERMISSION_CHANGE", entityType: "User",
      entityId: u.id, beforeState: { roleCode: "USER" }, afterState: { roleCode: "ADMIN", sessionsRevoked: "0" },
      ...noOrigin, sourceService: "identity-service", createdAt: u.createdAt,
    });
  }

  for (const b of store.bookings) {
    const actorId = b.channel === "online" ? b.userId : staffOf(b.companyId)?.id ?? null;
    add({
      companyId: b.companyId, actorUserId: actorId, actorType: actorId ? "USER" : "SYSTEM", action: "CREATE",
      entityType: "Booking", entityId: b.id, beforeState: null, afterState: { status: "confirmed", paymentStatus: "pending" },
      ...(actorId ? originOf(actorId) : noOrigin), sourceService: "booking-service", createdAt: b.createdAt,
    });
  }

  for (const h of store.parcelHistory.filter((x) => x.previousStatus !== null)) {
    const parcel = store.parcels.find((p) => p.id === h.parcelId)!;
    const staff = staffOf(parcel.companyId);
    add({
      companyId: parcel.companyId, actorUserId: staff?.id ?? null, actorType: staff ? "USER" : "SYSTEM", action: "UPDATE",
      entityType: "Parcel", entityId: parcel.id, beforeState: { status: h.previousStatus! }, afterState: { status: h.newStatus },
      ...(staff ? originOf(staff.id) : noOrigin), sourceService: "parcel-service", createdAt: h.changedAt,
    });
  }

  // The daily job's work: anonymise what is older than the company's retention.
  let anonymised = 0;
  for (const a of store.auditLogs) {
    if (!a.companyId || a.ipAddress === null) continue;
    const days = store.companies.find((c) => c.id === a.companyId)?.dataRetentionDays ?? DEFAULT_RETENTION_DAYS;
    if (nowMs - Date.parse(a.createdAt) > days * DAY_MS) {
      a.ipAddress = null;
      a.userAgent = null;
      anonymised++;
    }
  }
  const purgeAt = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 3, 15));
  if (purgeAt.getTime() > nowMs) purgeAt.setUTCDate(purgeAt.getUTCDate() - 1);
  add({
    companyId: null, actorUserId: null, actorType: "SYSTEM", action: "UPDATE", entityType: "RetentionPurge",
    entityId: purgeAt.toISOString().slice(0, 10), beforeState: null,
    afterState: { anonymisedAuditLogs: String(anonymised), anonymisedDataAccessLogs: "0" },
    ...noOrigin, sourceService: "audit-compliance-service", createdAt: purgeAt.toISOString(),
  });

  store.auditLogs.sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
}

/** Platform admins' accesses to personal data: one view per request, a modification per closed one, an export, three consent reads. */
function seedDataAccessLogs(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();
  const DAY_MS = 86_400_000;
  const activeAdmins = store.users.filter((u) => u.roleCode === "ADMIN" && u.status === "active");
  const admins = activeAdmins.length > 0 ? activeAdmins : store.users.filter((u) => u.roleCode === "ADMIN");
  const subjectTypeOf = (u: PlatformUser): DataSubjectType =>
    u.companyId !== null ? "EMPLOYEE" : u.roleCode === "USER" ? "CUSTOMER" : "USER";
  const add = (
    who: PlatformUser, subject: PlatformUser, dataCategory: DataCategory, accessReason: AccessReason,
    accessType: AccessType, createdAt: string,
  ): void => {
    store.dataAccessLogs.push({
      id: uid(64, seq++), accessedByUserId: who.id, accessedByLabel: null, dataSubjectType: subjectTypeOf(subject),
      dataSubjectId: subject.id, dataCategory, accessReason, accessType,
      ipAddress: store.sessions.find((s) => s.userId === who.id)?.ipAddress ?? "41.82.10.20", createdAt,
    });
  };
  const userOf = (id: string) => store.users.find((u) => u.id === id)!;

  store.dataSubjectRequests.forEach((r, k) => {
    const who = admins[k % admins.length]!;
    const subject = userOf(r.requesterUserId);
    const viewedAt = new Date(Math.min(Date.parse(r.createdAt) + DAY_MS, nowMs - 60_000)).toISOString();
    add(who, subject, "IDENTITY", "LEGAL_OBLIGATION", "VIEW", viewedAt);
    if (r.resolvedAt) {
      add(who, subject, "IDENTITY", "LEGAL_OBLIGATION", "MODIFY", r.resolvedAt);
      if (r.requestType === "PORTABILITY") add(who, subject, "IDENTITY", "LEGAL_OBLIGATION", "EXPORT", r.resolvedAt);
    }
  });

  const clients = store.users.filter((u) => u.roleCode === "USER" && u.companyId === null);
  const reads: [AccessReason, number][] = [["INVESTIGATION", -9], ["SUPPORT_REQUEST", -6], ["LEGAL_OBLIGATION", -2]];
  reads.forEach(([reason, days], k) => {
    add(admins[k % admins.length]!, clients[k % clients.length]!, "CONSENT", reason, "VIEW", new Date(nowMs + days * DAY_MS).toISOString());
  });
}

const SERVICE_BASE_MS: [string, number][] = [
  ["identity-service", 42], ["company-service", 55], ["fleet-service", 61], ["booking-service", 88],
  ["parcel-service", 70], ["hr-service", 70], ["customer-service", 64], ["notification-service", 52],
  ["audit-compliance-service", 49], ["monitoring-service", 38],
];

/**
 * Forty-eight health checks per live service, one every 30 minutes, the last 20 seconds before the seed date;
 * notification-service is down for its last six, parcel-service degraded for its last four, booking-service has one
 * isolated blip. A retired `gateway` keeps twelve checks from two days ago: the "stale" case.
 */
function seedServiceChecks(store: Store, now: Date): void {
  let seq = 1;
  const nowMs = now.getTime();
  const STEP = 30 * 60_000;
  const push = (serviceName: string, status: ServiceStatus, responseTimeMs: number, checkedAtMs: number): void => {
    store.serviceChecks.push({
      id: uid(71, seq++), serviceName, environment: "production", status, responseTimeMs, errorRatePercent: null,
      checkedAt: new Date(checkedAtMs).toISOString(),
    });
  };

  SERVICE_BASE_MS.forEach(([name, base], i) => {
    for (let k = 0; k < 48; k++) {
      const fromEnd = 47 - k;
      let status: ServiceStatus = "healthy";
      let ms = base + ((k * 7 + i * 13) % 20);
      if (name === "notification-service" && fromEnd < 6) { status = "down"; ms = 8000 + (k % 5) * 20; }
      if (name === "parcel-service" && fromEnd < 4) { status = "degraded"; ms = 1400 + (k % 4) * 25; }
      if (name === "booking-service" && k === 20) { status = "degraded"; ms = 1100; }
      push(name, status, ms, nowMs - 20_000 - fromEnd * STEP);
    }
  });
  for (let k = 0; k < 12; k++) push("gateway", "healthy", 14 + (k % 3), nowMs - 2 * 86_400_000 - (11 - k) * STEP);
}

/** Eight platform incidents: three open (investigating, identified, monitoring), five resolved, two with a postmortem. */
function seedSystemIncidents(store: Store, iso: (offsetDays: number) => string): void {
  let seq = 1;
  const active = store.companies.filter((c) => c.status === "active");
  const add = (
    incidentCode: string, serviceName: string, severity: IncidentSeverity, status: IncidentStatus, title: string,
    description: string | null, impactScope: ImpactScope, affectedCompanyId: string | null,
    detectedDays: number, resolvedDays: number | null, postmortemUrl: string | null,
  ): void => {
    store.systemIncidents.push({
      id: uid(72, seq++), incidentCode, serviceName, severity, status, title, description, impactScope, affectedCompanyId,
      detectedAt: iso(detectedDays), resolvedAt: resolvedDays === null ? null : iso(resolvedDays),
      reportedBy: "admin@sira.app", postmortemUrl, createdAt: iso(detectedDays),
      updatedAt: status === "INVESTIGATING" ? null : iso(detectedDays + 0.1),
    });
  };

  add("SYS-A1B2C3D4", "notification-service", "HIGH", "INVESTIGATING", "Notifications non envoyées",
    "Les envois d'e-mail et de SMS échouent depuis ce matin.", "PLATFORM_WIDE", null, -0.2, null, null);
  add("SYS-E5F6G7H8", "parcel-service", "MEDIUM", "MONITORING", "Latence élevée sur les colis",
    "Le suivi des colis répond lentement ; un correctif est en observation.", "MULTI_COMPANY", null, -1, null, null);
  add("SYS-J9K1L2M3", "identity-service", "LOW", "RESOLVED", "Échec de connexion intermittent",
    "Quelques connexions échouaient sans cause visible.", "PLATFORM_WIDE", null, -6, -5.5, null);
  add("SYS-M4N5P6Q7", "booking-service", "HIGH", "IDENTIFIED", "Échecs de réservation sur une compagnie",
    "Les réservations d'une compagnie échouent à la création ; la cause est identifiée.", "SINGLE_COMPANY", active[1]!.id, -2, null, null);
  add("SYS-R8S9T1U2", "fleet-service", "CRITICAL", "RESOLVED", "Indisponibilité de la flotte",
    "Le service de flotte était injoignable pendant plusieurs minutes.", "PLATFORM_WIDE", null, -20, -19.9,
    "https://status.sira.app/postmortems/2026-10-13");
  add("SYS-V3W4X5Y6", "hr-service", "MEDIUM", "RESOLVED", "Retard de synchronisation RH",
    "Les embauches d'une compagnie n'apparaissaient pas dans les comptes.", "SINGLE_COMPANY", active[2]!.id, -35, -34.5, null);
  add("SYS-Z7A8B9C1", "audit-compliance-service", "LOW", "RESOLVED", "Rapports de conformité lents",
    null, "MULTI_COMPANY", null, -50, -49.5, null);
  add("SYS-D2E3F4G5", "company-service", "HIGH", "RESOLVED", "Authentification des API partenaires",
    "Les clés d'API de partenaires étaient refusées.", "PLATFORM_WIDE", null, -70, -69.8,
    "https://status.sira.app/postmortems/2026-08-24");
}

interface ApiEndpointDef {
  method: "GET" | "POST" | "PATCH"; endpoint: string; perDay: number; ms: number; p4: number; p5: number; open?: boolean;
}
const API_ENDPOINTS: ApiEndpointDef[] = [
  { method: "POST", endpoint: "/auth/login", perDay: 420, ms: 180, p4: 0.08, p5: 0.002, open: true },
  { method: "GET", endpoint: "/public/trips/search", perDay: 900, ms: 140, p4: 0.01, p5: 0.004, open: true },
  { method: "POST", endpoint: "/me/bookings", perDay: 160, ms: 420, p4: 0.06, p5: 0.01 },
  { method: "GET", endpoint: "/me/bookings/{id}", perDay: 380, ms: 90, p4: 0.005, p5: 0.002 },
  { method: "POST", endpoint: "/me/bookings/{id}/payment", perDay: 110, ms: 650, p4: 0.04, p5: 0.02 },
  { method: "GET", endpoint: "/bookings", perDay: 300, ms: 110, p4: 0.01, p5: 0.003 },
  { method: "GET", endpoint: "/bookings/{id}", perDay: 260, ms: 70, p4: 0.02, p5: 0.002 },
  { method: "GET", endpoint: "/trips", perDay: 280, ms: 95, p4: 0.005, p5: 0.001 },
  { method: "PATCH", endpoint: "/trips/{id}/status", perDay: 60, ms: 85, p4: 0.03, p5: 0.002 },
  { method: "GET", endpoint: "/parcels/track/{id}", perDay: 340, ms: 120, p4: 0.15, p5: 0.004, open: true },
  { method: "GET", endpoint: "/notifications/me", perDay: 500, ms: 60, p4: 0.002, p5: 0.001 },
  { method: "POST", endpoint: "/parcels", perDay: 70, ms: 380, p4: 0.04, p5: 0.01 },
  { method: "GET", endpoint: "/companies/{id}", perDay: 150, ms: 55, p4: 0.01, p5: 0.001 },
  { method: "GET", endpoint: "/health/services", perDay: 90, ms: 45, p4: 0, p5: 0 },
];
const API_SHARES = [0.4, 0.3, 0.2, 0.1];

/**
 * Thirty days of API traffic aggregates for four active companies (and anonymous callers on the public endpoints),
 * with a weekly rhythm and a degradation of the parcel and notification endpoints during the last two days.
 */
function seedApiUsage(store: Store, now: Date): void {
  const DAY_MS = 86_400_000;
  const companyIds = store.companies.filter((c) => c.status === "active").slice(0, 4).map((c) => c.id);

  for (let d = 0; d < 30; d++) {
    const at = new Date(now.getTime() - d * DAY_MS);
    const day = at.toISOString().slice(0, 10);
    const dow = at.getUTCDay();
    API_ENDPOINTS.forEach((e, ei) => {
      const factor = (dow === 0 ? 0.6 : dow === 6 ? 0.8 : 1) * (1 + ((d * 31 + ei * 17) % 11) / 50);
      const degraded = d <= 1 && (e.endpoint.startsWith("/parcels") || e.endpoint === "/notifications/me");
      const p5 = degraded ? e.p5 * 8 + 0.03 : e.p5;
      const slow = degraded ? 3 : 1;
      const noise = ((d * 13 + ei * 7) % 9) / 40 - 0.1;
      const targets: [string | null, number][] = [
        ...companyIds.map((id, k): [string | null, number] => [id, e.open ? API_SHARES[k]! * 0.8 : API_SHARES[k]!]),
        ...(e.open ? [[null, 0.2] as [string | null, number]] : []),
      ];
      for (const [companyId, share] of targets) {
        const total = Math.round(e.perDay * factor * share);
        if (total === 0) continue;
        const n5 = Math.round(total * p5);
        const n4 = Math.round(total * e.p4);
        const n2 = Math.max(0, total - n4 - n5);
        const ok = Math.max(1, Math.round(e.ms * slow * (1 + noise)));
        const classes: [ApiUsageRow["statusClass"], number, number, number][] = [
          ["2xx", n2, ok, ok * (4 + (d % 3))],
          ["4xx", n4, Math.max(1, Math.round(e.ms * 0.6)), Math.max(1, Math.round(e.ms * 0.6)) * 3],
          ["5xx", n5, Math.round(e.ms * slow * 2.5), Math.round(e.ms * slow * 2.5) * 4],
        ];
        for (const [statusClass, count, avgResponseMs, maxResponseMs] of classes) {
          if (count <= 0) continue;
          store.apiUsage.push({ day, companyId, endpoint: e.endpoint, method: e.method, statusClass, count, avgResponseMs, maxResponseMs });
        }
      }
    });
  }
}

const TEAM_JOURNAL: [number, string, string][] = [
  [-40, "ibrahima.sow", "Type de document KYC désactivé"],
  [-31, "fatou.diallo", "Plan Starter : prix mensuel modifié"],
  [-27, "moustapha.ndiaye", "Compagnie suspendue pour impayé"],
  [-19, "fatou.diallo", "Facture relancée"],
  [-14, "moustapha.ndiaye", "Donnée personnelle révélée : téléphone de pape.mbaye"],
  [-11, "ibrahima.sow", "Paliers partenaires consultés pour audit"],
  [-8, "moustapha.ndiaye", "Donnée personnelle révélée : e-mail de aissatou.sarr"],
  [-6, "fatou.diallo", "Campagne annulée"],
  [-3, "ibrahima.sow", "Incident déclaré (Haute) sur booking-service"],
  [-2, "fatou.diallo", "Demande RGPD (accès) : reçue → en cours"],
];

/**
 * Six backoffice administrators with their 8-hour sessions (relative to the seed date), plus ten journal entries
 * written by the other active administrators. `admin@sira.app` is the signed-in demo identity.
 */
function seedBackofficeTeam(store: Store, iso: (offsetDays: number) => string): void {
  let adminSeq = 1, sessionSeq = 1, journalSeq = 1;
  const h = (hours: number) => iso(hours / 24);

  const addAdmin = (
    identifier: string, displayName: string, status: AdminStatus,
    createdDaysAgo: number, enrolledDaysAgo: number | null, recoveryCodesRemaining: number,
  ): BackofficeAdmin => {
    const admin: BackofficeAdmin = {
      id: uid(81, adminSeq++), identifier, displayName, status,
      totpEnabled: enrolledDaysAgo !== null, totpEnrolledAt: enrolledDaysAgo === null ? null : iso(-enrolledDaysAgo),
      recoveryCodesRemaining, lastLoginAt: null, createdAt: iso(-createdDaysAgo),
    };
    store.backofficeAdmins.push(admin);
    return admin;
  };
  const addSession = (
    admin: BackofficeAdmin, deviceLabel: string, ipAddress: string, startHours: number, lastSeenHours: number,
    options: { current?: boolean; revokedReason?: string } = {},
  ): void => {
    const createdAt = h(startHours);
    store.backofficeSessions.push({
      id: uid(82, sessionSeq++), adminId: admin.id, deviceLabel, ipAddress, createdAt, lastSeenAt: h(lastSeenHours),
      expiresAt: h(startHours + 8),
      revokedAt: options.revokedReason ? h(lastSeenHours) : null, revokedReason: options.revokedReason ?? null,
      current: options.current ?? false,
    });
    if (admin.lastLoginAt === null || createdAt > admin.lastLoginAt) admin.lastLoginAt = createdAt;
  };

  const self = addAdmin("admin@sira.app", "Administrateur Sira", "active", 400, 399, 8);
  const moustapha = addAdmin("moustapha.ndiaye@sira.app", "Moustapha Ndiaye", "active", 300, 299, 6);
  const ibrahima = addAdmin("ibrahima.sow@sira.app", "Ibrahima Sow", "active", 250, 249, 8);
  const fatou = addAdmin("fatou.diallo@sira.app", "Fatou Diallo", "active", 200, 199, 5);
  const seynabou = addAdmin("seynabou.kane@sira.app", "Seynabou Kane", "suspended", 180, 179, 3);
  addAdmin("awa.fall@sira.app", "Awa Fall", "invited", 2, null, 0);

  addSession(self, "Chrome · macOS", "41.82.14.23", -1, -0.05, { current: true });
  addSession(self, "Application Android", "196.207.31.8", -3, -0.5);
  addSession(self, "Firefox · Ubuntu", "41.82.77.54", -5, -2);
  addSession(self, "Safari · iPhone", "196.207.5.19", -48, -47.5);
  addSession(moustapha, "Chrome · Windows", "41.82.9.120", -2, -1);
  addSession(ibrahima, "Edge · Windows", "196.207.44.67", -4, -3);
  addSession(fatou, "Chrome · Windows", "41.82.101.3", -1.5, -0.2);
  addSession(fatou, "Application Android", "196.207.88.201", -6, -5);
  addSession(seynabou, "Firefox · Ubuntu", "41.82.23.15", -24 * 20, -24 * 20 + 1, { revokedReason: "Compte suspendu" });

  for (const [days, username, action] of TEAM_JOURNAL) {
    store.activity.push({ id: uid(83, journalSeq++), companyId: null, at: iso(days), actor: `${username}@sira.app`, action, scope: "backoffice" });
  }
}
