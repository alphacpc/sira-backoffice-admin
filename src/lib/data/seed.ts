import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Booking, BookingChannel, BookingPaymentStatus, BookingStatus, Bus, BusMaintenance, BusType, Company, CompanyStatus, CrewMember, CrewRole, DsrRequest,
  Employee, FeatureDef, FeatureFlag, Fleet, FuelType, Incident, Invoice, KycDocument, KycDocumentType,
  MaintenanceCategory, MaintenanceStatus, PartnerTier, PaymentAttempt, PermissionDef, Plan, PlanLimits,
  PlatformUser, Referral, RetryOutcome, Role, RolePermission, Route, SeatMap, SeatState, ServiceHealth,
  Station, Subscription, SubscriptionChangeKind, SubscriptionHistoryEntry, SubscriptionStatus, Trip,
  PaymentMethod, PaymentMethodKind, Ticket, TicketStatus, Transaction, TransactionStatus,
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
  services: ServiceHealth[];
  incidents: Incident[];
  dsr: DsrRequest[];
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
    activity: [], services: [], incidents: [], dsr: [],
    plans: [], featureDefs: [], partnerTiers: [], kycTypes: [],
    subscriptionHistory: [], paymentAttempts: [], retryOutcomes: {},
    users: [], roles: [], permissions: [], rolePermissions: [], sessions: [],
    stations: [], routes: [], fleets: [], vendors: [], seatMaps: [], maintenances: [], crew: [],
    paymentMethods: [], bookings: [], transactions: [], tickets: [],
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

  store.services = [
    ["identity-service", "healthy", 42], ["company-service", "healthy", 55],
    ["fleet-service", "healthy", 61], ["booking-service", "healthy", 88],
    ["parcel-service", "degraded", 1450], ["hr-service", "healthy", 70],
    ["customer-service", "healthy", 64], ["notification-service", "down", 0],
    ["audit-compliance-service", "healthy", 49], ["monitoring-service", "healthy", 38],
  ].map(([name, status, ms]) => ({
    name: name as string, status: status as ServiceHealth["status"], responseTimeMs: ms as number,
  }));

  store.incidents = [
    { id: uid(10, 1), code: "SYS-A1B2C3D4", title: "Notifications non envoyées", serviceName: "notification-service", severity: "HIGH", status: "INVESTIGATING", detectedAt: iso(-0.2) },
    { id: uid(10, 2), code: "SYS-E5F6G7H8", title: "Latence élevée sur les colis", serviceName: "parcel-service", severity: "MEDIUM", status: "MONITORING", detectedAt: iso(-1) },
    { id: uid(10, 3), code: "SYS-J9K1L2M3", title: "Échec de connexion intermittent", serviceName: "identity-service", severity: "LOW", status: "RESOLVED", detectedAt: iso(-6) },
  ];

  store.dsr = [
    { id: uid(11, 1), type: "ERASURE", status: "IN_PROGRESS", dueDate: iso(3), requesterRef: "usr-4f1c" },
    { id: uid(11, 2), type: "ACCESS", status: "RECEIVED", dueDate: iso(12), requesterRef: "usr-9a27" },
    { id: uid(11, 3), type: "RECTIFICATION", status: "RECEIVED", dueDate: iso(-2), requesterRef: "usr-c3d0" },
  ];

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
