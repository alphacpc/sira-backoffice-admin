import { notFound, redirect } from "next/navigation";
import { ApiError, apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";
import type {
  ActivityEntry, BusStatus, Company, CompanyDetail, CompanyStatus, Employee, FeatureFlag, FleetBus, FleetTrip,
  Invoice, KycDocument, KycDocumentType, PlanLimits, Referral, Subscription, SubscriptionStatus, TripStatus,
  UsageBreakdown, UsageMetric,
} from "@/lib/types";

/**
 * Converters from the raw sections of GET /admin/companies/{id}/detail (admin-bff-service) to the front's
 * CompanyDetail. Every converter is pure and defensive: a null, partial or oddly shaped section never throws.
 */
type Raw = Record<string, unknown>;

export interface LiveDetailBody {
  company?: unknown; partnerStatus?: unknown; documents?: unknown; documentTypes?: unknown; subscriptions?: unknown;
  invoices?: unknown; billingHistory?: unknown; planLimit?: unknown; features?: unknown; featureCatalog?: unknown;
  usageLogs?: unknown; bookingsBreakdown?: unknown; parcelsBreakdown?: unknown; referrals?: unknown; credits?: unknown;
  employees?: unknown; buses?: unknown; trips?: unknown; activity?: unknown; owner?: unknown;
  warnings?: { section: string; reason: string }[];
}

/** Masked placeholders: the platform never sends the real contact, only whether one exists. */
export const MASKED_EMAIL = "•••••@•••••";
export const MASKED_PHONE = "••• •• •• ••";

const isObj = (v: unknown): v is Raw => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : typeof v === "number" ? String(v) : d);
const strOrNull = (v: unknown): string | null => (typeof v === "string" && v !== "" ? v : null);
const num = (v: unknown, d = 0): number => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() !== "" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : d;
};
const lower = (v: unknown): string => str(v).toLowerCase();

/** A list from a bare array or from a `{content: [...]}` page; anything else is empty. */
export function rows(v: unknown): Raw[] {
  const list = Array.isArray(v) ? v : isObj(v) && Array.isArray(v.content) ? v.content : [];
  return list.filter(isObj);
}

const COMPANY_STATUSES: CompanyStatus[] = ["draft", "active", "suspended", "closed"];
const TIERS = ["STANDARD", "SILVER", "GOLD"] as const;

export function toCompany(raw: unknown, partner: unknown, fallbackId = ""): Company {
  const c = isObj(raw) ? raw : {};
  const status = lower(c.status) as CompanyStatus;
  const tier = isObj(partner) ? str(partner.currentTierCode).toUpperCase() : "";
  return {
    id: str(c.id, fallbackId), slug: str(c.slug), name: str(c.name, "—"),
    status: COMPANY_STATUSES.includes(status) ? status : "draft",
    country: str(c.country), currency: str(c.currency),
    // Empty when the company has none: maskEmail/maskPhone then show their generic form.
    contactEmail: c.hasContactEmail === true ? MASKED_EMAIL : "",
    contactPhone: c.hasContactPhone === true ? MASKED_PHONE : "",
    registrationNumber: str(c.registrationNumber), ninea: str(c.ninea),
    createdAt: str(c.createdAt), activatedAt: strOrNull(c.activatedAt),
    forceActivated: c.forceActivated === true,
    dataRetentionDays: typeof c.dataRetentionDays === "number" ? c.dataRetentionDays : null,
    partnerTier: (TIERS as readonly string[]).includes(tier) ? (tier as Company["partnerTier"]) : "STANDARD",
  };
}

export function toKycTypes(raw: unknown): KycDocumentType[] {
  return rows(raw).map((t) => ({
    code: str(t.code), name: str(t.label, str(t.code)), required: t.required === true, active: t.active !== false,
  }));
}

export function toDocuments(raw: unknown, types: unknown, companyId = ""): KycDocument[] {
  const byId = new Map(rows(types).map((t) => [str(t.id), t]));
  return rows(raw).map((d) => {
    const t = byId.get(str(d.documentTypeId));
    const status = lower(d.status);
    return {
      id: str(d.id), companyId: str(d.companyId, companyId), typeCode: str(t?.code), typeName: str(t?.label, str(t?.code, "Document")),
      status: status === "approved" || status === "rejected" ? status : "pending",
      uploadedAt: str(d.createdAt), reviewedAt: strOrNull(d.reviewedAt),
      reviewedBy: d.reviewedBy ? "Équipe Sira" : null, rejectionReason: strOrNull(d.rejectionReason),
    };
  });
}

const SUB_STATUSES: SubscriptionStatus[] = ["trial", "active", "past_due", "suspended", "expired", "canceled"];
const LIVE_SUB = ["trial", "active", "past_due", "suspended"];

export function toSubscription(raw: unknown): Subscription | null {
  const list = rows(raw).map((s) => {
    const st = lower(s.status) as SubscriptionStatus;
    const sub: Subscription = {
      id: str(s.id), companyId: str(s.companyId), planId: str(s.planId), planName: str(s.planName, "—"),
      status: SUB_STATUSES.includes(st) ? st : "active",
      billingCycle: str(s.billingCycle).toUpperCase() === "YEARLY" ? "YEARLY" : "MONTHLY",
      price: num(s.totalAmount ?? s.price), currency: str(s.currency),
      nextBillingDate: str(s.nextBillingDate, str(s.startDate, str(s.dateSubscription))),
      trialEndDate: strOrNull(s.trialEndDate), pastDueSince: strOrNull(s.pastDueSince),
    };
    return { sub, at: str(s.dateSubscription) };
  });
  // The live subscription first, otherwise the most recent one.
  list.sort((x, y) => y.at.localeCompare(x.at));
  return (list.find((e) => LIVE_SUB.includes(e.sub.status)) ?? list[0])?.sub ?? null;
}

export function toInvoices(raw: unknown, subscriptionId = ""): Invoice[] {
  return rows(raw).map((i) => ({
    id: str(i.id), companyId: str(i.companyId), subscriptionId, number: str(i.invoiceNumber),
    amount: num(i.totalAmount), currency: str(i.currency),
    // The front only knows paid / failed: every status other than PAID reads as failed.
    status: str(i.status).toUpperCase() === "PAID" ? "paid" : "failed",
    issuedAt: str(i.invoiceDate, str(i.periodStart)),
  }));
}

export function toLimits(raw: unknown, usedUsers: number, usedBuses: number): PlanLimits | null {
  if (!isObj(raw)) return null;
  return { maxUsers: num(raw.maxUsers), usedUsers, maxBuses: num(raw.maxBuses), usedBuses };
}

export function toFeatures(companyFeatures: unknown, catalog: unknown): FeatureFlag[] {
  const byId = new Map(rows(catalog).map((f) => [str(f.id), f]));
  return rows(companyFeatures).map((f) => {
    const def = byId.get(str(f.featureId));
    return { code: str(def?.code, str(f.featureId)), name: str(def?.name, str(def?.code, "Fonctionnalité")), enabled: f.isEnabled === true };
  });
}

const METRIC_LABELS: Record<string, string> = {
  bookings_created: "Réservations créées", parcels_created: "Colis créés", api_calls: "Appels API",
};

export function toUsage(logs: unknown, bookings: unknown, parcels: unknown): UsageMetric[] {
  const sums = new Map<string, number>();
  for (const l of rows(logs)) {
    const code = str(l.metricCode);
    if (code) sums.set(code, (sums.get(code) ?? 0) + num(l.value));
  }
  // Without usage logs, the breakdowns still give the two headline counters.
  if (!sums.has("bookings_created") && Array.isArray(bookings)) {
    sums.set("bookings_created", rows(bookings).reduce((a, r) => a + num(r.count), 0));
  }
  if (!sums.has("parcels_created") && Array.isArray(parcels)) {
    sums.set("parcels_created", rows(parcels).reduce((a, r) => a + num(r.count), 0));
  }
  return [...sums].map(([metricCode, value]) => ({ metricCode, label: METRIC_LABELS[metricCode] ?? metricCode, value }));
}

const PARCEL_STATUSES = ["PENDING", "IN_TRANSIT", "AT_HUB", "DELIVERED", "CANCELLED", "RETURNED", "LOST"];

export function toBreakdown(bookings: unknown, parcels: unknown): UsageBreakdown {
  return {
    bookings: rows(bookings).map((r) => ({
      channel: lower(r.channel) === "online" ? "online" : "counter",
      status: lower(r.status) === "cancelled" ? "cancelled" : "confirmed",
      count: num(r.count), amount: num(r.amount), currency: str(r.currency),
    })),
    parcels: rows(parcels).map((r) => {
      const s = str(r.status).toUpperCase();
      return { status: (PARCEL_STATUSES.includes(s) ? s : "PENDING") as UsageBreakdown["parcels"][number]["status"], count: num(r.count), fees: num(r.fees), currency: str(r.currency) };
    }),
    // No live source for the API journal yet.
    api: [],
  };
}

export function toReferral(referrals: unknown, credits: unknown): Referral {
  const list = rows(referrals);
  const active = list.find((r) => str(r.status).toUpperCase() === "ACTIVE") ?? list[0];
  return {
    code: strOrNull(active?.referralCode),
    credits: rows(credits).map((c) => ({
      id: str(c.id), amount: num(c.amount), currency: str(c.currency),
      status: str(c.status).toUpperCase() === "APPLIED" ? "APPLIED" : "AVAILABLE",
    })),
  };
}

function roleOf(jobTitle: string): Employee["role"] {
  const t = jobTitle.toLowerCase();
  if (/chauffeur|driver|conducteur/.test(t)) return "CHAUFFEUR";
  if (/manag|gestion|direct|respons/.test(t)) return "MANAGER";
  return "GUICHETIER";
}

/** The owner as sent by identity-service: a UserLookup, a `{companyId, owner}` pair, or a list of pairs. */
function ownerLookup(raw: unknown, companyId: string): Raw | null {
  if (Array.isArray(raw)) {
    const hit = raw.filter(isObj).find((o) => str(o.companyId) === companyId);
    return hit ? ownerLookup(hit, companyId) : null;
  }
  if (!isObj(raw)) return null;
  if (isObj(raw.owner)) return raw.owner;
  return raw.username || raw.displayName ? raw : null;
}

export function toEmployees(raw: unknown, ownerRaw: unknown, companyId: string): Employee[] {
  const list: Employee[] = rows(raw).map((e) => ({
    id: str(e.id), companyId: str(e.companyId, companyId),
    name: str(e.employeeCode, str(e.jobTitle, "Employé")),
    // hr-service holds no contact; the generic masked forms keep the panel readable.
    email: "", phone: "", role: roleOf(str(e.jobTitle)), userId: strOrNull(e.userId),
  }));
  const owner = ownerLookup(ownerRaw, companyId);
  if (owner) {
    const userId = strOrNull(owner.id);
    const name = str(owner.displayName, str(owner.username, "Gestionnaire"));
    const email = str(owner.emailMasked);
    const phone = str(owner.phoneMasked);
    const at = userId ? list.findIndex((e) => e.userId === userId) : -1;
    const known = at >= 0 ? list[at] : undefined;
    const entry: Employee = known
      ? { ...known, name, email, phone, role: "MANAGER" }
      : { id: userId ?? `owner-${companyId}`, companyId, name, email, phone, role: "MANAGER", userId };
    if (known) list[at] = entry; else list.unshift(entry);
  }
  return list;
}

export function toBuses(raw: unknown, companyId = ""): FleetBus[] {
  const statuses: BusStatus[] = ["active", "maintenance", "retired"];
  return rows(raw).map((b) => {
    const s = lower(b.status) as BusStatus;
    return { id: str(b.id), companyId: str(b.companyId, companyId), plate: str(b.plateNumber, str(b.busCode, "—")), status: statuses.includes(s) ? s : "active" };
  });
}

export function toTrips(raw: unknown, companyId = ""): FleetTrip[] {
  return rows(raw).map((t) => {
    const s = lower(t.status);
    const status: TripStatus = s === "planned" || s === "boarding" || s === "departed" || s === "cancelled" ? s
      : s === "completed" || s === "arrived" ? "departed" : "planned";
    return { id: str(t.id), companyId: str(t.companyId, companyId), route: str(t.routeLabel, "—"), departure: str(t.departure), status };
  });
}

export function toActivity(raw: unknown, companyId = ""): ActivityEntry[] {
  return rows(raw).map((a) => ({
    id: str(a.id), companyId: strOrNull(a.companyId) ?? companyId,
    at: str(a.occurredAt, str(a.createdAt)),
    actor: str(a.actorUserId, str(a.actorType, "SYSTEM")),
    action: [str(a.action), str(a.entityType)].filter(Boolean).join(" · ") || "Action",
    ...(strOrNull(a.actorUserId) ? { userId: str(a.actorUserId) } : {}),
  })).sort((x, y) => y.at.localeCompare(x.at));
}

export function toCompanyDetail(body: LiveDetailBody, id = ""): CompanyDetail {
  const company = toCompany(body.company, body.partnerStatus, id);
  const employees = toEmployees(body.employees, body.owner, company.id);
  const buses = toBuses(body.buses, company.id);
  const busTotal = isObj(body.buses) && typeof body.buses.totalElements === "number" ? body.buses.totalElements : buses.length;
  const subscription = toSubscription(body.subscriptions);
  return {
    company,
    documents: toDocuments(body.documents, body.documentTypes, company.id),
    kycTypes: toKycTypes(body.documentTypes),
    subscription,
    invoices: toInvoices(body.invoices, subscription?.id ?? ""),
    limits: toLimits(body.planLimit, employees.length, busTotal),
    features: toFeatures(body.features, body.featureCatalog),
    usage: toUsage(body.usageLogs, body.bookingsBreakdown, body.parcelsBreakdown),
    usageBreakdown: toBreakdown(body.bookingsBreakdown, body.parcelsBreakdown),
    referral: toReferral(body.referrals, body.credits),
    employees, buses, trips: toTrips(body.trips, company.id),
    activity: toActivity(body.activity, company.id),
  };
}

/** Fetches one company sheet; null when the platform answers 404. */
export async function liveCompanyDetail(id: string): Promise<CompanyDetail> {
  try {
    const token = await currentBackendToken();
    const body = await apiCall<LiveDetailBody>(`/admin/companies/${encodeURIComponent(id)}/detail`, { token });
    if (!isObj(body) || !isObj(body.company)) notFound();
    return toCompanyDetail(body, id);
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401 || e.status === 403) redirect("/session-expiree");
      if (e.status === 404) notFound();
    }
    throw e;
  }
}

/** Asks the platform for one company contact; the value is never logged. */
export async function liveRevealContact(companyId: string, field: "email" | "phone"): Promise<string> {
  const token = await currentBackendToken();
  const res = await apiCall<{ value?: string | null }>(`/admin/companies/${encodeURIComponent(companyId)}/contact-reveals`, {
    method: "POST", body: { field }, token,
  });
  return typeof res?.value === "string" ? res.value : "";
}
