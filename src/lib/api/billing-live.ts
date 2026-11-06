import { loadAll, soft } from "@/lib/api/care-live";
import { arr, num, numOrNull, obj, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import type { FeatureWithPlans, TierWithCount } from "@/lib/repos/billing";
import {
  fold, urgencyOf, URGENCIES,
  type ChannelPaymentRow, type HubTab, type OwnerSubscriptionRow, type PaymentChannel, type PlanCard, type PlanInvoiceRow, type UnpaidOwnerRow,
} from "@/lib/repos/billing-hub";
import type { KycDocumentType, PartnerTierCode, SubscriptionStatus } from "@/lib/types";

const SUB_STATUSES = ["trial", "active", "past_due", "suspended", "expired", "canceled"] as const;
const lower = (v: unknown) => (typeof v === "string" ? v.toLowerCase() : "");
const subStatus = (v: unknown): SubscriptionStatus => (SUB_STATUSES as readonly string[]).includes(lower(v)) ? (lower(v) as SubscriptionStatus) : "expired";
const paid = (v: unknown): "paid" | "failed" => (lower(v) === "paid" ? "paid" : "failed");
const content = (raw: unknown) => arr(obj(raw).content);

// --- subscriptions, payments, invoices, unpaid ------------------------------------------------------------

/** Owner e-mail and phone are never sent by the list endpoints: they stay null and the reveal buttons stay inert. */
export function toSubscription(raw: unknown): OwnerSubscriptionRow {
  const s = obj(raw);
  return {
    id: str(s.id), companyId: str(s.companyId), planName: str(s.planName, "—"), status: subStatus(s.status),
    billingCycle: lower(s.billingCycle) === "yearly" ? "YEARLY" : "MONTHLY", price: num(s.price), currency: str(s.currency, "XOF"),
    nextBillingDate: str(s.nextBillingDate), companyName: str(s.companyName, "—"), ownerName: strOrNull(s.ownerName), ownerEmail: null, ownerPhone: null,
    paidVolume: num(s.paidVolume), paidCount: num(s.paidCount), failedCount: num(s.failedCount), lastReminderAt: null,
  };
}

export function toPayment(raw: unknown): ChannelPaymentRow {
  const p = obj(raw);
  return {
    id: str(p.id), subscriptionId: str(p.subscriptionId), companyId: str(p.companyId), amount: num(p.amount), currency: str(p.currency, "XOF"),
    status: paid(p.status), at: str(p.at), invoiceId: strOrNull(p.invoiceId), reason: strOrNull(p.reason), companyName: str(p.companyName, "—"),
    invoiceNumber: strOrNull(p.invoiceNumber), channel: str(p.channel, "—") as PaymentChannel, payerPhone: null, cardHolder: null, cardLast4: null,
  };
}

export function toInvoice(raw: unknown): PlanInvoiceRow {
  const i = obj(raw);
  return {
    id: str(i.id), number: str(i.number, "—"), subscriptionId: str(i.subscriptionId), companyId: str(i.companyId), amount: num(i.amount),
    currency: str(i.currency, "XOF"), status: paid(i.status), issuedAt: str(i.issuedAt), companyName: str(i.companyName, "—"),
    planName: strOrNull(i.planName), ownerName: null, ownerEmail: null, lastSentAt: null,
  };
}

export function toUnpaid(raw: unknown): UnpaidOwnerRow {
  const u = obj(raw);
  const daysLeft = num(u.daysLeft);
  const urgency = (URGENCIES as readonly string[]).includes(str(u.urgency)) ? (str(u.urgency) as UnpaidOwnerRow["urgency"]) : urgencyOf(daysLeft);
  return {
    id: str(u.id), companyId: str(u.companyId), companyName: str(u.companyName, "—"), planName: str(u.planName, "—"),
    status: lower(u.status) === "suspended" ? "suspended" : "past_due", price: num(u.price), currency: str(u.currency, "XOF"),
    pastDueSince: str(u.pastDueSince), deadline: str(u.deadline) === "expiration" ? "expiration" : "suspension", daysLeft,
    ownerName: null, ownerEmail: null, ownerPhone: null, nextBillingDate: str(u.nextBillingDate), lastReminderAt: null,
    delayDays: num(u.delayDays), urgency,
  };
}

export const liveSubscriptions = async (f: { q?: string; status?: string }) =>
  (await loadAll("/admin/billing/subscriptions", withFilters({ q: f.q, status: f.status?.toUpperCase() }))).map(toSubscription);

export const livePayments = async (f: { q?: string; status?: string; from?: string; to?: string }) =>
  (await loadAll("/admin/billing/payment-attempts", withFilters({ q: f.q, status: f.status?.toUpperCase(), from: f.from, to: f.to }))).map(toPayment);

export const liveInvoices = async (f: { q?: string; status?: string; from?: string; to?: string }) =>
  (await loadAll("/admin/billing/invoices", withFilters({ q: f.q, status: f.status?.toUpperCase(), from: f.from, to: f.to }))).map(toInvoice);

export const liveUnpaid = async (f: { q?: string; status?: string; urgency?: string }) =>
  (await loadAll("/admin/billing/unpaid", withFilters({ q: f.q, status: f.status?.toUpperCase(), urgency: f.urgency }))).map(toUnpaid);

/** Whole-history figures (the loaded list stops at 500 rows). */
export async function livePaymentFigures() {
  const raw = await soft<unknown>("/admin/billing/payment-attempts?size=1");
  const s = obj(obj(raw).summary);
  return { count: num(s.count), paid: num(s.paidCount), failed: num(s.failedCount), paidAmount: num(s.paidAmount) };
}
export async function liveSubscriptionFigures() {
  const raw = await soft<unknown>("/admin/billing/subscriptions?size=1");
  const s = obj(obj(raw).summary);
  return { total: num(s.total), active: num(s.active), trial: num(s.trial), unpaid: num(s.unpaidOrSuspended) };
}

// --- catalogue ---------------------------------------------------------------------------------------------

interface RawFeature { id: string; code: string; name: string; kind: "boolean" | "quota"; active: boolean }
interface Catalogue { plans: PlanCard[]; features: FeatureWithPlans[]; links: Map<string, string[]> }

/** Plans and features, joined through each plan's feature list (a handful of calls: the catalogue is small). */
async function catalogue(): Promise<Catalogue> {
  const [planRaw, featRaw] = await Promise.all([loadAll("/plans", new URLSearchParams()), loadAll("/features", new URLSearchParams())]);
  const feats: RawFeature[] = featRaw.map(obj).map((f) => ({
    id: str(f.id), code: str(f.code), name: str(f.name, "—"), kind: lower(f.featureType) === "boolean" ? "boolean" : "quota", active: lower(f.status) !== "inactive",
  }));
  const byId = new Map(feats.map((f) => [f.id, f]));
  const planLinks = await Promise.all(planRaw.map(obj).map((p) => soft<unknown>(`/plans/${str(p.id)}/features`)));
  const links = new Map<string, string[]>();
  const plans = planRaw.map(obj).map((p, i): PlanCard => {
    const enabled = (Array.isArray(planLinks[i]) ? (planLinks[i] as unknown[]) : content(planLinks[i])).map(obj).filter((x) => x.isEnabled !== false);
    const names = enabled.map((x) => byId.get(str(x.featureId))).filter((f): f is RawFeature => !!f);
    for (const f of names) links.set(f.id, [...(links.get(f.id) ?? []), str(p.id)]);
    return {
      id: str(p.id), code: str(p.code) || "—", name: str(p.name, "—"), priceMonthly: num(p.priceMonthly), priceYearly: num(p.priceYearly),
      currency: str(p.currency, "XOF"), trialDays: num(p.trialDays), status: lower(p.status) === "inactive" ? "inactive" : "active",
      liveSubscriptions: num(p.liveSubscriptions), features: names.map((f) => f.name), maxBuses: num(p.maxBuses), maxUsers: num(p.maxUsers),
    };
  });
  const planById = new Map(plans.map((p) => [p.id, p]));
  const features = feats.map((f): FeatureWithPlans => ({
    code: f.code, name: f.name, kind: f.kind,
    plans: (links.get(f.id) ?? []).map((id) => planById.get(id)).filter((p): p is PlanCard => !!p).map((p) => ({ id: p.id, name: p.name, status: p.status })),
  }));
  return { plans, features, links };
}

export async function livePlans(q?: string, status?: "active" | "inactive"): Promise<PlanCard[]> {
  const hit = (...v: (string | number)[]) => !q || v.some((x) => fold(String(x)).includes(fold(q)));
  return (await catalogue()).plans.filter((p) => (!status || p.status === status) && hit(p.name, p.code, p.priceMonthly, p.priceYearly, ...p.features));
}

export async function liveFeatures(q?: string, kind?: "boolean" | "quota"): Promise<FeatureWithPlans[]> {
  const hit = (...v: string[]) => !q || v.some((x) => fold(x).includes(fold(q)));
  return (await catalogue()).features.filter((f) => (!kind || f.kind === kind) && hit(f.name, f.code, ...f.plans.map((p) => p.name)));
}

export async function liveTiers(q?: string): Promise<TierWithCount[]> {
  const rows = (await loadAll("/partner-tiers", new URLSearchParams())).map(obj);
  const hit = (...v: string[]) => !q || v.some((x) => fold(x).includes(fold(q)));
  return rows.map((t): TierWithCount => ({
    code: str(t.code) as PartnerTierCode, minMonths: num(t.minTenureMonths), discountPercent: num(t.discountPercentage), companies: num(t.companyCount),
  })).filter((t) => hit(t.code, `${t.discountPercent}`, `${t.minMonths}`)).sort((a, b) => a.minMonths - b.minMonths);
}

export async function liveKycTypes(q?: string, filter?: "required" | "optional" | "inactive"): Promise<KycDocumentType[]> {
  const raw = await soft<unknown>("/company-document-types");
  const hit = (...v: string[]) => !q || v.some((x) => fold(x).includes(fold(q)));
  return (Array.isArray(raw) ? raw.map(obj) : []).map((t): KycDocumentType => ({ code: str(t.code), name: str(t.label) || str(t.code), required: t.required === true, active: t.active !== false }))
    .filter((t) => (!filter || (filter === "required" ? t.required : filter === "optional" ? !t.required : !t.active)) && hit(t.name, t.code));
}

/** Null counter = its source failed, so the tab shows no badge. */
export async function liveHubCounts(q: string): Promise<Record<HubTab, number | null>> {
  const [raw, plans, features, tiers, kyc] = await Promise.all([
    soft<unknown>(`/admin/billing/search-counts?${withFilters({ q: q || undefined })}`),
    livePlans(q).then((r) => r.length).catch(() => null), liveFeatures(q).then((r) => r.length).catch(() => null),
    liveTiers(q).then((r) => r.length).catch(() => null), liveKycTypes(q).then((r) => r.length).catch(() => null),
  ]);
  const c = obj(raw);
  const n = raw ? true : false;
  return {
    plans, fonctionnalites: features, paliers: tiers, documents: kyc,
    abonnements: n ? numOrNull(c.abonnements) : null, paiements: n ? numOrNull(c.paiements) : null,
    factures: n ? numOrNull(c.factures) : null, impayes: n ? numOrNull(c.impayes) : null,
  };
}

// --- detail pages -------------------------------------------------------------------------------------------

import { call } from "@/lib/api/sales-live";
import { ApiError } from "@/lib/api/http";
import type { InvoiceDetail, SubscriptionDetail } from "@/lib/repos/billing";
import type { Plan, SubscriptionChangeKind, SubscriptionHistoryEntry } from "@/lib/types";

const KINDS: readonly SubscriptionChangeKind[] = ["TRIAL_START", "ACTIVATION", "UPGRADE", "DOWNGRADE", "RENEWAL", "PLAN_CHANGE", "CANCELLATION", "REACTIVATION"];

async function detailOf(path: string): Promise<unknown | null> {
  try {
    return await call<unknown>(path);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

export async function liveSubscriptionDetail(id: string): Promise<SubscriptionDetail | null> {
  const raw = await detailOf(`/admin/billing/subscriptions/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const d = obj(raw);
  const row = toSubscription(d.subscription);
  const [history, payments, invoices] = await Promise.all([
    soft<unknown>(`/admin/billing/subscriptions/${encodeURIComponent(id)}/history`),
    loadAll(`/admin/billing/subscriptions/${encodeURIComponent(id)}/payment-attempts`, new URLSearchParams()), liveInvoices({}).catch(() => []),
  ]);
  const plan = obj(d.plan);
  return {
    subscription: {
      id: row.id, companyId: row.companyId, planId: str(obj(d.subscription).planId), planName: row.planName, status: row.status, billingCycle: row.billingCycle,
      price: row.price, currency: row.currency, nextBillingDate: row.nextBillingDate, trialEndDate: strOrNull(d.trialEndDate), pastDueSince: strOrNull(d.pastDueSince),
    },
    companyName: row.companyName,
    plan: str(plan.id) ? ({ id: str(plan.id), code: "—", name: str(plan.name, "—"), priceMonthly: 0, priceYearly: 0, setupFee: 0, currency: row.currency, trialDays: 0, status: "active", limits: { maxUsers: 0, maxBuses: 0 }, featureCodes: [] } satisfies Plan) : null,
    history: (Array.isArray(history) ? history.map(obj) : []).map((h): SubscriptionHistoryEntry => ({
      id: str(h.id), subscriptionId: id, kind: (KINDS as readonly string[]).includes(str(h.kind)) ? (str(h.kind) as SubscriptionChangeKind) : "PLAN_CHANGE",
      fromPlan: strOrNull(h.fromPlan), toPlan: strOrNull(h.toPlan), at: str(h.at),
    })),
    payments: payments.map(toPayment), invoices: invoices.filter((i) => i.subscriptionId === id),
    canRetry: d.canRetry === true, canCancel: d.canCancel === true,
  };
}

export async function liveInvoiceDetail(id: string): Promise<InvoiceDetail | null> {
  const raw = await detailOf(`/admin/billing/invoices/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const d = obj(raw);
  const inv = toInvoice(d.invoice);
  const sub = d.subscription && typeof d.subscription === "object" ? toSubscription(d.subscription) : null;
  return {
    invoice: { id: inv.id, companyId: inv.companyId, subscriptionId: inv.subscriptionId, number: inv.number, amount: inv.amount, currency: inv.currency, status: inv.status, issuedAt: inv.issuedAt },
    companyName: inv.companyName,
    subscription: sub ? { id: sub.id, companyId: sub.companyId, planName: sub.planName, status: sub.status, billingCycle: sub.billingCycle, price: sub.price, currency: sub.currency, nextBillingDate: sub.nextBillingDate, companyName: sub.companyName } : null,
    payment: d.payment && typeof d.payment === "object" ? toPayment(d.payment) : null,
  };
}
