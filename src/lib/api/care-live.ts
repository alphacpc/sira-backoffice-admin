import { ApiError } from "@/lib/api/http";
import { arr, call, liveCompanyNames, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import type { CareOverview, TieredCustomer, TrackedParcel } from "@/lib/repos/care-hub";
import { TIERS, type CareTab } from "@/lib/repos/care-hub";
import type { FeedbackRow, LoyaltyProgramRow } from "@/lib/repos/clients";
import { PARCEL_STATUSES } from "@/lib/repos/parcels";
import type { FeedbackStatus, FeedbackType, MembershipType, ParcelPaymentStatus, ParcelStatus, ParcelType } from "@/lib/types";

const PAGE = 100;
const MAX_PAGES = 5;
const PARCEL_TYPES = ["DOCUMENT", "PACKAGE", "FRAGILE", "PERISHABLE", "OTHER"] as const;
const FEEDBACK_TYPES = ["TRIP", "BUS", "STATION", "SERVICE", "PARCEL"] as const;
const FEEDBACK_STATUS = ["PENDING", "REVIEWED", "RESOLVED", "IGNORED"] as const;

type Names = Map<string, string>;
const nameOf = (names: Names, id: string) => names.get(id) ?? "—";

export function toTrackedParcel(raw: unknown): TrackedParcel {
  const p = obj(raw);
  return {
    id: str(p.id), parcelCode: str(p.parcelCode, "—"), trackingNumber: str(p.trackingNumber, "—"), companyId: str(p.companyId),
    companyName: str(p.companyName, "—"), senderName: str(p.senderName, "—"), recipientName: str(p.recipientName, "—"),
    routeLabel: str(p.routeLabel, "—"), parcelType: pick<ParcelType>(p.parcelType, PARCEL_TYPES, true, "OTHER"),
    weightKg: num(p.weightKg), shippingFee: num(p.shippingFee), currency: str(p.currency, "XOF"),
    status: pick<ParcelStatus>(p.status, PARCEL_STATUSES, true, "PENDING"),
    paymentStatus: pick<ParcelPaymentStatus>(p.paymentStatus, ["PENDING", "PAID", "REFUNDED"], true, "PENDING"),
    legCount: num(p.legCount), createdAt: str(p.createdAt), expectedAt: str(p.expectedAt), deliveredAt: strOrNull(p.deliveredAt),
    late: p.late === true,
  };
}

/** The backend has no online-booking count, parcel count or account status: those fields are placeholders the live tables hide. */
export function toCustomer(raw: unknown): TieredCustomer {
  const c = obj(raw);
  const tier = typeof c.tier === "string" ? pick<MembershipType | "">(c.tier, [...TIERS, ""], true, "") : "";
  return {
    id: str(c.id), name: str(c.name, "—"), isCorporate: c.corporate === true, accountCount: num(c.accountCount),
    totalPoints: num(c.totalPoints), onlineBookings: 0, parcelCount: 0, feedbackCount: num(c.feedbackCount),
    sponsored: c.sponsored === true, userStatus: "active", createdAt: str(c.createdAt), tier: tier || null,
  };
}

export function toProgram(raw: unknown, names: Names): LoyaltyProgramRow {
  const p = obj(raw);
  return {
    id: str(p.id), companyId: str(p.companyId), companyName: nameOf(names, str(p.companyId)), name: str(p.name, "—"),
    pointsPerCurrencyUnit: num(p.pointsPerCurrencyUnit), redemptionRate: num(p.redemptionRate),
    minPointsForRedemption: num(p.minPointsForRedemption), status: pick<"ACTIVE" | "INACTIVE">(p.status, ["ACTIVE", "INACTIVE"], true, "INACTIVE"),
    accounts: num(p.accounts), pointsIssued: num(p.pointsIssued),
  };
}

export function toFeedback(raw: unknown, names: Names): FeedbackRow {
  const f = obj(raw);
  return {
    id: str(f.id), companyId: str(f.companyId), companyName: nameOf(names, str(f.companyId)), customerId: str(f.customerId),
    customerName: str(f.customerName, "—"), feedbackType: pick<FeedbackType>(f.feedbackType, FEEDBACK_TYPES, true, "SERVICE"),
    rating: Math.min(5, Math.max(0, Math.round(num(f.rating)))), title: str(f.title, "—"),
    status: pick<FeedbackStatus>(f.status, FEEDBACK_STATUS, true, "PENDING"), responded: f.responded === true, createdAt: str(f.createdAt),
  };
}

/** Tier shares in the fixed REGULAR, VIP, PREMIUM order (the donut colours depend on it). */
export function toTiers(raw: unknown): { tier: MembershipType; value: number }[] {
  const rows = Array.isArray(raw) ? raw.map(obj) : [];
  return TIERS.map((tier) => ({ tier, value: rows.filter((r) => str(r.tier).toUpperCase() === tier).reduce((n, r) => n + num(r.value), 0) }));
}

export function toOverview(raw: unknown, names: Names): CareOverview {
  const o = obj(raw);
  const p = obj(o.parcels), c = obj(o.customers), r = obj(o.reviews);
  const byStatusRaw = p.byStatus && typeof p.byStatus === "object" ? obj(p.byStatus) : null;
  const byStatus = byStatusRaw
    ? (Object.fromEntries(PARCEL_STATUSES.map((s) => [s, num(byStatusRaw[s])])) as Record<ParcelStatus, number>)
    : null;
  // Late items carry no route or company name: the card omits blanks.
  const late = arr(p.late).map((l): TrackedParcel => ({ ...toTrackedParcel(l), routeLabel: "", companyName: names.get(str(l.companyId)) ?? "" }));
  return {
    parcels: {
      total: num(p.total), byStatus, deliveryRate: numOrNull(p.deliveryRate), avgHours: numOrNull(p.avgHours), revenue: numOrNull(p.revenue),
      late, lateCount: num(p.lateCount, late.length),
      byType: arr(p.byType).map((t) => ({ type: pick<ParcelType>(t.type, PARCEL_TYPES, true, "OTHER"), value: num(t.value) })),
    },
    customers: {
      total: num(c.total), fresh: numOrNull(c.fresh), corporate: num(c.corporate), avgPoints: numOrNull(c.avgPoints),
      tiers: toTiers(c.tiers), top: Array.isArray(c.top) && c.top.length ? c.top.map(toCustomer) : null,
    },
    reviews: {
      average: numOrNull(r.average), total: num(r.total), pending: num(r.pending),
      distribution: Array.isArray(r.distribution) ? r.distribution.map((n) => num(n)) : [],
      recent: arr(r.recent).map((f) => toFeedback(f, names)),
    },
  };
}

/** Null counter = its source failed: the tab shows no badge. */
export function toCareCounts(raw: unknown): Record<CareTab, number | null> {
  const c = obj(raw);
  return { apercu: 0, colis: numOrNull(c.colis), comptes: numOrNull(c.comptes), fidelite: numOrNull(c.fidelite), avis: numOrNull(c.avis) };
}

// ---------------------------------------------------------------------------------------------------------

/** Optional data: a 400 or a failing source gives null; auth errors still redirect. */
export async function soft<T>(path: string): Promise<T | null> {
  try {
    return await call<T>(path);
  } catch (e) {
    if (e instanceof ApiError) return null;
    throw e;
  }
}

export async function loadAll(path: string, params: URLSearchParams): Promise<unknown[]> {
  const rows: unknown[] = [];
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs = new URLSearchParams(params);
      qs.set("page", String(page));
      qs.set("size", String(PAGE));
      const res = obj(await call<unknown>(`${path}?${qs}`));
      const content = Array.isArray(res.content) ? res.content : [];
      rows.push(...content);
      const pages = res.totalPages !== undefined ? num(res.totalPages, 1) : Math.ceil(num(res.totalElements) / PAGE);
      if (page + 1 >= pages || content.length === 0) break;
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) return [];
    throw e;
  }
  return rows;
}

export async function names(): Promise<Names> {
  try {
    return new Map((await liveCompanyNames()).map((c) => [c.id, c.name]));
  } catch (e) {
    if (e instanceof ApiError) return new Map();
    throw e;
  }
}

export async function liveCareCounts(q?: string, companyId?: string) {
  return toCareCounts(await soft(`/admin/care/search-counts?${withFilters({ q, companyId })}`));
}

export async function liveCareOverview(companyId?: string): Promise<CareOverview> {
  const [raw, n] = await Promise.all([soft<unknown>(`/admin/care/overview?${withFilters({ companyId })}`), names()]);
  return toOverview(raw, n);
}

export async function liveParcels(f: { q?: string; companyId?: string; status?: string; type?: string }): Promise<TrackedParcel[]> {
  const rows = await loadAll("/admin/care/parcels", withFilters(f));
  return rows.map(toTrackedParcel);
}

export interface ParcelStats { total: number; inCirculation: number; delivered: number; late: number }
export async function liveParcelStats(companyId?: string): Promise<ParcelStats | null> {
  const raw = await soft<unknown>(`/admin/parcels/stats?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  return { total: num(s.total), inCirculation: num(s.inCirculation), delivered: num(s.delivered), late: num(s.late) };
}

export async function liveCustomers(q?: string): Promise<TieredCustomer[]> {
  return (await loadAll("/admin/customers", withFilters({ q }))).map(toCustomer);
}

export interface CustomerStats { total: number; corporate: number; totalPoints: number }
export async function liveCustomerStats(): Promise<CustomerStats | null> {
  const raw = await soft<unknown>("/admin/customers/stats");
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  return { total: num(s.total), corporate: num(s.corporate), totalPoints: num(s.totalPoints) };
}

export async function livePrograms(f: { q?: string; companyId?: string }): Promise<LoyaltyProgramRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/loyalty-programs", withFilters(f)), names()]);
  return rows.map((r) => toProgram(r, n));
}

export async function liveTierDistribution(companyId?: string) {
  return toTiers(await soft<unknown>(`/admin/loyalty-accounts/tier-distribution?${withFilters({ companyId })}`));
}

export async function liveFeedbacks(f: { q?: string; companyId?: string; status?: string; rating?: number }): Promise<FeedbackRow[]> {
  const [rows, n] = await Promise.all([
    loadAll("/admin/feedbacks", withFilters({ ...f, rating: f.rating ? String(f.rating) : undefined })), names(),
  ]);
  return rows.map((r) => toFeedback(r, n));
}

export interface FeedbackSummary { average: number | null; total: number; distribution: number[]; pending: number }
export async function liveFeedbackSummary(companyId?: string): Promise<FeedbackSummary | null> {
  const raw = await soft<unknown>(`/admin/feedbacks/summary?${withFilters({ companyId })}`);
  if (!raw || typeof raw !== "object") return null;
  const s = obj(raw);
  const total = num(s.total);
  return {
    average: total ? numOrNull(s.average) : null, total, pending: num(s.pending),
    distribution: Array.isArray(s.distribution) ? s.distribution.map((n) => num(n)) : [0, 0, 0, 0, 0],
  };
}
