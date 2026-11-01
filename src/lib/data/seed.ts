import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Company, CompanyStatus, DsrRequest, Employee, FeatureDef, FeatureFlag,
  FleetBus, FleetTrip, Incident, Invoice, KycDocument, KycDocumentType, PartnerTier,
  PaymentAttempt, Plan, PlanLimits, Referral, RetryOutcome, ServiceHealth, Subscription,
  SubscriptionChangeKind, SubscriptionHistoryEntry, SubscriptionStatus, UsageMetric,
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
  buses: FleetBus[];
  trips: FleetTrip[];
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

const ROUTES = [
  "Dakar → Saint-Louis", "Dakar → Touba", "Dakar → Ziguinchor",
  "Thiès → Kaolack", "Mbour → Dakar",
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
  };
  let docSeq = 1, subSeq = 1, invSeq = 1, empSeq = 1, busSeq = 1, tripSeq = 1, actSeq = 1;
  let attSeq = 1, histSeq = 1;

  store.plans = [...PLANS, LEGACY_PLAN].map((p, n) => ({
    id: uid(12, n + 1), code: p.code, name: p.name, priceMonthly: p.price, priceYearly: p.yearly,
    setupFee: p.setup, currency: "XOF", trialDays: p.trial, status: p.status,
    limits: { maxUsers: p.users, maxBuses: p.buses }, featureCodes: [...p.features],
  }));
  store.featureDefs = FEATURE_DEFS.map((f) => ({ ...f }));
  store.partnerTiers = TIERS.map((t) => ({ ...t }));
  store.kycTypes = KYC_TYPES.map((t) => ({ code: t.code, name: t.name, required: true, active: true }));

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

    // People, fleet
    const roles: Employee["role"][] = ["MANAGER", "GUICHETIER", "CHAUFFEUR"];
    const peopleCount = status === "draft" ? 1 : 3;
    for (let p = 0; p < peopleCount; p++) {
      const person = PEOPLE[(i + p) % PEOPLE.length]!;
      store.employees.push({
        id: uid(6, empSeq++), companyId: id, name: person,
        email: `${slugify(person)}@${slug}.sn`,
        phone: `+2217865${String(10000 + i * 211 + p * 17).padStart(5, "0")}`,
        role: roles[p]!,
      });
    }
    if (status === "active") {
      for (let b = 0; b < 2 + (i % 3); b++) {
        store.buses.push({
          id: uid(7, busSeq++), companyId: id, plate: `DK-${1000 + i * 10 + b}-AB`,
          status: b === 0 && i % 4 === 0 ? "maintenance" : "active",
        });
      }
      for (let t = 0; t < 2; t++) {
        store.trips.push({
          id: uid(8, tripSeq++), companyId: id, route: ROUTES[(i + t) % ROUTES.length]!,
          departure: iso(t + 1), status: t === 0 ? "boarding" : "planned",
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
