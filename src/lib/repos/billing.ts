import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  FeatureDef, Invoice, KycDocumentType, PartnerTier, PaymentAttempt, Plan, Subscription,
  SubscriptionHistoryEntry, SubscriptionStatus,
} from "@/lib/types";

/** Statuses that still bind a company to its plan ("en cours"). */
export const LIVE_STATUSES: readonly SubscriptionStatus[] = ["trial", "active", "past_due", "suspended"];

/** Client-safe projection of a subscription. */
export type SubscriptionRow = Pick<
  Subscription, "id" | "companyId" | "planName" | "status" | "billingCycle" | "price" | "currency" | "nextBillingDate"
> & { companyName: string };

/** Client-safe projection of a plan. */
export type PlanRow = Pick<
  Plan, "id" | "code" | "name" | "priceMonthly" | "priceYearly" | "currency" | "trialDays" | "status"
> & { liveSubscriptions: number };

export interface PlanDetail { plan: Plan; features: FeatureDef[]; subscriptions: SubscriptionRow[] }
export interface FeatureWithPlans extends FeatureDef { plans: Pick<Plan, "id" | "name" | "status">[] }
export interface TierWithCount extends PartnerTier { companies: number }

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function subscriptionRow(s: Subscription): SubscriptionRow {
  return {
    id: s.id, companyId: s.companyId, companyName: companyName(s.companyId), planName: s.planName,
    status: s.status, billingCycle: s.billingCycle, price: s.price, currency: s.currency,
    nextBillingDate: s.nextBillingDate,
  };
}

export const plansRepo = {
  list(): Plan[] {
    return getStore().plans;
  },

  listRows(): PlanRow[] {
    const subs = getStore().subscriptions;
    return getStore().plans.map((p) => ({
      id: p.id, code: p.code, name: p.name, priceMonthly: p.priceMonthly, priceYearly: p.priceYearly,
      currency: p.currency, trialDays: p.trialDays, status: p.status,
      liveSubscriptions: subs.filter((s) => s.planId === p.id && LIVE_STATUSES.includes(s.status)).length,
    }));
  },

  get(id: string): Plan | undefined {
    return getStore().plans.find((p) => p.id === id);
  },

  detail(id: string): PlanDetail | undefined {
    const s = getStore();
    const plan = s.plans.find((p) => p.id === id);
    if (!plan) return undefined;
    return {
      plan,
      features: plan.featureCodes
        .map((code) => s.featureDefs.find((f) => f.code === code))
        .filter((f): f is FeatureDef => f !== undefined),
      subscriptions: s.subscriptions.filter((x) => x.planId === id).map(subscriptionRow),
    };
  },
};

export const featuresRepo = {
  list(): FeatureWithPlans[] {
    const s = getStore();
    return s.featureDefs.map((f) => ({
      ...f,
      plans: s.plans
        .filter((p) => p.featureCodes.includes(f.code))
        .map((p) => ({ id: p.id, name: p.name, status: p.status })),
    }));
  },
};

export const tiersRepo = {
  list(): TierWithCount[] {
    const s = getStore();
    return [...s.partnerTiers]
      .sort((a, b) => a.minMonths - b.minMonths)
      .map((t) => ({ ...t, companies: s.companies.filter((c) => c.partnerTier === t.code).length }));
  },
};

export const kycTypesRepo = {
  list(): KycDocumentType[] {
    return getStore().kycTypes;
  },

  /** Types a draft company must have approved to be activated automatically. */
  requiredActive(): KycDocumentType[] {
    return getStore().kycTypes.filter((t) => t.active && t.required);
  },

  setActive(code: string, active: boolean, reason: string, actor = "admin@sira.app"): KycDocumentType {
    const type = getStore().kycTypes.find((t) => t.code === code);
    if (!type) throw new Error("Type de document introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (type.active === active) return type;
    if (!active && type.required && kycTypesRepo.requiredActive().length === 1) {
      throw new Error("Impossible de désactiver le dernier type de document obligatoire actif");
    }
    type.active = active;
    addActivity(
      null, actor,
      `Type de document KYC « ${type.name} » ${active ? "réactivé" : "désactivé"}. Motif : ${motif}`,
    );
    return type;
  },
};

export const SUSPENSION_DELAY_DAYS = 7;
export const EXPIRATION_DELAY_DAYS = 30;
export const RETRY_FAILURE_REASON = "Paiement refusé par l'opérateur (simulation)";
const DAY = 86_400_000;

/** Client-safe projection of an invoice. */
export type InvoiceRow = Pick<
  Invoice, "id" | "number" | "subscriptionId" | "companyId" | "amount" | "currency" | "status" | "issuedAt"
> & { companyName: string };

/** Client-safe projection of a payment attempt. */
export type PaymentRow = Pick<
  PaymentAttempt, "id" | "subscriptionId" | "companyId" | "amount" | "currency" | "status" | "at" | "invoiceId" | "reason"
> & { companyName: string; invoiceNumber: string | null };

/** Client-safe row of the unpaid queue. */
export interface UnpaidRow {
  id: string;
  companyId: string;
  companyName: string;
  planName: string;
  status: "past_due" | "suspended";
  price: number;
  currency: string;
  pastDueSince: string;
  deadline: "suspension" | "expiration";
  daysLeft: number;
}

export interface SubscriptionDetail {
  subscription: Subscription;
  companyName: string;
  plan: Plan | null;
  history: SubscriptionHistoryEntry[];
  payments: PaymentRow[];
  invoices: InvoiceRow[];
  canRetry: boolean;
  canCancel: boolean;
}

export interface InvoiceDetail {
  invoice: Invoice;
  companyName: string;
  subscription: SubscriptionRow | null;
  payment: PaymentRow | null;
}

export function canRetry(status: SubscriptionStatus): boolean {
  return status === "past_due" || status === "suspended";
}

export function canCancel(status: SubscriptionStatus): boolean {
  return status !== "canceled" && status !== "expired";
}

function invoiceRow(i: Invoice): InvoiceRow {
  return {
    id: i.id, number: i.number, subscriptionId: i.subscriptionId, companyId: i.companyId,
    companyName: companyName(i.companyId), amount: i.amount, currency: i.currency,
    status: i.status, issuedAt: i.issuedAt,
  };
}

function paymentRow(p: PaymentAttempt): PaymentRow {
  const invoice = p.invoiceId ? getStore().invoices.find((i) => i.id === p.invoiceId) : undefined;
  return {
    id: p.id, subscriptionId: p.subscriptionId, companyId: p.companyId,
    companyName: companyName(p.companyId), amount: p.amount, currency: p.currency,
    status: p.status, at: p.at, invoiceId: p.invoiceId, reason: p.reason,
    invoiceNumber: invoice?.number ?? null,
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

/** Next free number: the highest numeric suffix plus one (never reuses a number). */
function nextInvoiceNumber(now: Date): string {
  const max = getStore().invoices.reduce((m, i) => Math.max(m, Number(i.number.slice(-4)) || 0), 0);
  return `INV-${now.getUTCFullYear()}-${String(max + 1).padStart(4, "0")}`;
}

function addOneMonth(iso: string): string {
  const d = new Date(iso);
  d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString();
}

function requireSubscription(id: string): Subscription {
  const sub = getStore().subscriptions.find((s) => s.id === id);
  if (!sub) throw new Error("Abonnement introuvable");
  return sub;
}

export const subscriptionsRepo = {
  list(filter: { status?: SubscriptionStatus } = {}): Subscription[] {
    return getStore().subscriptions.filter((s) => !filter.status || s.status === filter.status);
  },

  listRows(filter: { status?: SubscriptionStatus } = {}): SubscriptionRow[] {
    return subscriptionsRepo.list(filter).map(subscriptionRow);
  },

  get(id: string): Subscription | undefined {
    return getStore().subscriptions.find((s) => s.id === id);
  },

  detail(id: string): SubscriptionDetail | undefined {
    const s = getStore();
    const sub = s.subscriptions.find((x) => x.id === id);
    if (!sub) return undefined;
    return {
      subscription: sub,
      companyName: companyName(sub.companyId),
      plan: s.plans.find((p) => p.id === sub.planId) ?? null,
      history: s.subscriptionHistory
        .filter((h) => h.subscriptionId === id)
        .sort((a, b) => a.at.localeCompare(b.at)),
      payments: s.paymentAttempts
        .filter((p) => p.subscriptionId === id)
        .sort(byNewest((p) => p.at))
        .map(paymentRow),
      invoices: s.invoices
        .filter((i) => i.subscriptionId === id)
        .sort(byNewest((i) => i.issuedAt))
        .map(invoiceRow),
      canRetry: canRetry(sub.status),
      canCancel: canCancel(sub.status),
    };
  },

  /** Unpaid and suspended subscriptions, most urgent first, against an injected reference date. */
  unpaidQueue(now: Date = new Date()): UnpaidRow[] {
    return getStore().subscriptions
      .filter((s): s is Subscription & { status: "past_due" | "suspended" } =>
        s.status === "past_due" || s.status === "suspended")
      .map((s) => {
        const since = s.pastDueSince ?? now.toISOString();
        const elapsed = Math.floor((now.getTime() - new Date(since).getTime()) / DAY);
        const deadline: UnpaidRow["deadline"] = s.status === "past_due" ? "suspension" : "expiration";
        const limit = s.status === "past_due"
          ? SUSPENSION_DELAY_DAYS
          : SUSPENSION_DELAY_DAYS + EXPIRATION_DELAY_DAYS;
        return {
          id: s.id, companyId: s.companyId, companyName: companyName(s.companyId),
          planName: s.planName, status: s.status, price: s.price, currency: s.currency,
          pastDueSince: since, deadline, daysLeft: limit - elapsed,
        };
      })
      .sort((a, b) => a.daysLeft - b.daysLeft || a.companyName.localeCompare(b.companyName));
  },

  retryPayment(id: string, actor = "admin@sira.app", now: Date = new Date()): PaymentAttempt {
    const s = getStore();
    const sub = requireSubscription(id);
    if (!canRetry(sub.status)) {
      throw new Error("Relance impossible : l'abonnement n'est ni impayé ni suspendu");
    }
    const at = now.toISOString();
    const outcome = s.retryOutcomes[sub.id] ?? "success";
    if (outcome === "failure") {
      const failed: PaymentAttempt = {
        id: crypto.randomUUID(), subscriptionId: sub.id, companyId: sub.companyId,
        amount: sub.price, currency: sub.currency, status: "failed", at,
        invoiceId: null, reason: RETRY_FAILURE_REASON,
      };
      s.paymentAttempts.push(failed);
      addActivity(sub.companyId, actor, "Relance du paiement de l'abonnement : échec", now);
      return failed;
    }
    const invoice: Invoice = {
      id: crypto.randomUUID(), companyId: sub.companyId, subscriptionId: sub.id,
      number: nextInvoiceNumber(now), amount: sub.price, currency: sub.currency,
      status: "paid", issuedAt: at,
    };
    s.invoices.push(invoice);
    const paid: PaymentAttempt = {
      id: crypto.randomUUID(), subscriptionId: sub.id, companyId: sub.companyId,
      amount: sub.price, currency: sub.currency, status: "paid", at,
      invoiceId: invoice.id, reason: null,
    };
    s.paymentAttempts.push(paid);
    sub.status = "active";
    sub.pastDueSince = null;
    sub.nextBillingDate = addOneMonth(sub.nextBillingDate);
    addActivity(sub.companyId, actor, "Relance du paiement de l'abonnement : réussie, abonnement réactivé", now);
    return paid;
  },

  cancel(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Subscription {
    const sub = requireSubscription(id);
    if (!canCancel(sub.status)) throw new Error("L'abonnement est déjà annulé ou expiré");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    sub.status = "canceled";
    sub.pastDueSince = null;
    getStore().subscriptionHistory.push({
      id: crypto.randomUUID(), subscriptionId: sub.id, kind: "CANCELLATION",
      fromPlan: sub.planName, toPlan: null, at: now.toISOString(),
    });
    addActivity(sub.companyId, actor, `Abonnement annulé. Motif : ${motif}`, now);
    return sub;
  },
};

export const invoicesRepo = {
  list(filter: { status?: Invoice["status"] } = {}): Invoice[] {
    return getStore().invoices
      .filter((i) => !filter.status || i.status === filter.status)
      .sort(byNewest((i) => i.issuedAt));
  },

  listRows(filter: { status?: Invoice["status"] } = {}): InvoiceRow[] {
    return invoicesRepo.list(filter).map(invoiceRow);
  },

  get(id: string): Invoice | undefined {
    return getStore().invoices.find((i) => i.id === id);
  },

  detail(id: string): InvoiceDetail | undefined {
    const s = getStore();
    const invoice = s.invoices.find((i) => i.id === id);
    if (!invoice) return undefined;
    const sub = s.subscriptions.find((x) => x.id === invoice.subscriptionId);
    const attempt = s.paymentAttempts.find((a) => a.invoiceId === invoice.id);
    return {
      invoice,
      companyName: companyName(invoice.companyId),
      subscription: sub ? subscriptionRow(sub) : null,
      payment: attempt ? paymentRow(attempt) : null,
    };
  },
};

export const paymentsRepo = {
  list(filter: { status?: PaymentAttempt["status"] } = {}): PaymentAttempt[] {
    return getStore().paymentAttempts
      .filter((p) => !filter.status || p.status === filter.status)
      .sort(byNewest((p) => p.at));
  },

  listRows(filter: { status?: PaymentAttempt["status"] } = {}): PaymentRow[] {
    return paymentsRepo.list(filter).map(paymentRow);
  },
};
