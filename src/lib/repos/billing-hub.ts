import {
  featuresRepo, invoicesRepo, kycTypesRepo, paymentsRepo, plansRepo, subscriptionsRepo, tiersRepo,
  type FeatureWithPlans, type InvoiceRow, type PaymentRow, type PlanRow, type SubscriptionRow, type TierWithCount,
  type UnpaidRow,
} from "@/lib/repos/billing";
import { EXPIRATION_DELAY_DAYS, INVOICE_RESENT_ACTION, REMINDER_ACTION, SUSPENSION_DELAY_DAYS } from "@/lib/repos/billing";
import { maskEmail, maskPhone } from "@/lib/mask";
import { getStore } from "@/lib/repos/store";
import type { KycDocumentType, SubscriptionStatus } from "@/lib/types";

export const HUB_TABS = ["plans", "fonctionnalites", "paliers", "documents", "abonnements", "paiements", "factures", "impayes"] as const;
export type HubTab = (typeof HUB_TABS)[number];
export const HUB_PAGE_SIZE = 12;

/** Lower-case and strip accents so « electricite » finds « Électricité ». */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

const SUB_STATUS_TEXT: Record<SubscriptionStatus, string> = {
  trial: "essai", active: "actif", past_due: "impaye", suspended: "suspendu", expired: "expire", canceled: "annule",
};

function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}

/** Subscription row with its company owner; the e-mail and phone are masked until revealed. */
export type OwnerSubscriptionRow = SubscriptionRow & {
  ownerName: string | null; ownerEmail: string | null; ownerPhone: string | null;
  /** Payment volume of the company: amount paid so far and number of paid / failed attempts. */
  paidVolume: number; paidCount: number; failedCount: number;
  /** When the owner was last reminded about this company, if ever. */
  lastReminderAt: string | null;
};

export const PAYMENT_CHANNELS = ["WAVE", "ORANGE_MONEY", "VISA", "MASTERCARD"] as const;
export type PaymentChannel = (typeof PAYMENT_CHANNELS)[number];
export const PAYMENT_CHANNEL_LABEL: Record<PaymentChannel, string> = {
  WAVE: "Wave", ORANGE_MONEY: "Orange Money", VISA: "Visa", MASTERCARD: "Mastercard",
};

/** Payment attempt with the channel it went through. */
export type ChannelPaymentRow = PaymentRow & {
  channel: PaymentChannel;
  /** Mobile money: the masked number that paid. Card: the holder name and the last four digits. */
  payerPhone: string | null; cardHolder: string | null; cardLast4: string | null;
};

/** The demo data carries no channel: it is derived from the attempt id so that it stays stable. */
function channelOf(id: string): PaymentChannel {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PAYMENT_CHANNELS[h % PAYMENT_CHANNELS.length]!;
}

/** Invoice with the plan it bills. */
export type PlanInvoiceRow = InvoiceRow & {
  planName: string | null; ownerName: string | null; ownerEmail: string | null; lastSentAt: string | null;
};
export interface InvoiceFilters { status?: "paid" | "failed"; from?: string; to?: string }

export const URGENCIES = ["critical", "soon", "normal"] as const;
export type Urgency = (typeof URGENCIES)[number];
export const urgencyOf = (daysLeft: number): Urgency => (daysLeft <= 2 ? "critical" : daysLeft <= 5 ? "soon" : "normal");

/** Unpaid subscription with its owner (e-mail and phone masked) and the delay it runs against. */
export type UnpaidOwnerRow = UnpaidRow & {
  ownerName: string | null; ownerEmail: string | null; ownerPhone: string | null;
  nextBillingDate: string; lastReminderAt: string | null; delayDays: number; urgency: Urgency;
};

export interface PaymentFilters {
  status?: "paid" | "failed"; channel?: PaymentChannel;
  /** Inclusive bounds, `YYYY-MM-DD` (UTC). */
  from?: string; to?: string;
}

export interface PlanCard extends PlanRow {
  features: string[]; maxBuses: number; maxUsers: number;
}

export const hubRepo = {
  plans(q?: string, status?: "active" | "inactive"): PlanCard[] {
    const hit = matcher(q);
    const s = getStore();
    return plansRepo.listRows()
      .map((p): PlanCard => {
        const plan = s.plans.find((x) => x.id === p.id)!;
        return {
          ...p, maxBuses: plan.limits.maxBuses, maxUsers: plan.limits.maxUsers,
          features: plan.featureCodes.map((c) => s.featureDefs.find((f) => f.code === c)?.name ?? c),
        };
      })
      .filter((p) => (!status || p.status === status) && hit(p.name, p.code, p.status === "active" ? "actif" : "inactif", p.priceMonthly, p.priceYearly, ...p.features));
  },

  features(q?: string, kind?: "boolean" | "quota"): FeatureWithPlans[] {
    const hit = matcher(q);
    return featuresRepo.list().filter((f) => (!kind || f.kind === kind) && hit(f.name, f.code, f.kind === "boolean" ? "activable" : "quota", ...f.plans.map((p) => p.name)));
  },

  tiers(q?: string): TierWithCount[] {
    const hit = matcher(q);
    return tiersRepo.list().filter((t) => hit(t.code, `${t.discountPercent}`, `${t.minMonths}`));
  },

  kycTypes(q?: string, filter?: "required" | "optional" | "inactive"): KycDocumentType[] {
    const hit = matcher(q);
    return kycTypesRepo.list().filter((t) =>
      (!filter || (filter === "required" ? t.required : filter === "optional" ? !t.required : !t.active)) &&
      hit(t.name, t.code, t.required ? "obligatoire" : "facultatif", t.active ? "actif" : "inactif"));
  },

  subscriptions(q?: string, status?: SubscriptionStatus): OwnerSubscriptionRow[] {
    const hit = matcher(q);
    const { employees, paymentAttempts, activity } = getStore();
    return subscriptionsRepo.listRows({ status })
      .map((x): OwnerSubscriptionRow => {
        const owner = employees.find((e) => e.companyId === x.companyId && e.role === "MANAGER");
        const attempts = paymentAttempts.filter((a) => a.companyId === x.companyId);
        const paid = attempts.filter((a) => a.status === "paid");
        return {
          ...x, ownerName: owner?.name ?? null,
          paidVolume: paid.reduce((n, a) => n + a.amount, 0), paidCount: paid.length,
          failedCount: attempts.length - paid.length,
          lastReminderAt: activity.filter((a) => a.companyId === x.companyId && a.action.startsWith(REMINDER_ACTION)).map((a) => a.at).sort().at(-1) ?? null,
          ownerEmail: owner ? maskEmail(owner.email) : null, ownerPhone: owner ? maskPhone(owner.phone) : null,
        };
      })
      .filter((x) => hit(x.companyName, x.ownerName, x.planName, SUB_STATUS_TEXT[x.status], x.billingCycle === "MONTHLY" ? "mensuel" : "annuel", x.price));
  },

  payments(q?: string, f: PaymentFilters = {}): ChannelPaymentRow[] {
    const hit = matcher(q);
    const employees = getStore().employees;
    return paymentsRepo.listRows({ status: f.status })
      .map((p): ChannelPaymentRow => {
        const channel = channelOf(p.id);
        const owner = employees.find((e) => e.companyId === p.companyId && e.role === "MANAGER");
        const mobile = channel === "WAVE" || channel === "ORANGE_MONEY";
        let h = 7;
        for (const ch of p.id) h = (h * 17 + ch.charCodeAt(0)) >>> 0;
        return {
          ...p, channel,
          payerPhone: mobile && owner ? maskPhone(owner.phone) : null,
          cardHolder: !mobile && owner ? owner.name.toUpperCase() : null,
          cardLast4: mobile ? null : String(1000 + (h % 9000)),
        };
      })
      .filter((p) =>
        (!f.channel || p.channel === f.channel) &&
        (!f.from || p.at.slice(0, 10) >= f.from) && (!f.to || p.at.slice(0, 10) <= f.to) &&
        hit(p.companyName, p.reason, p.invoiceNumber, p.amount, PAYMENT_CHANNEL_LABEL[p.channel]));
  },

  invoices(q?: string, f: InvoiceFilters = {}): PlanInvoiceRow[] {
    const hit = matcher(q);
    const { subscriptions: subs, employees, activity } = getStore();
    return invoicesRepo.listRows({ status: f.status })
      .map((i): PlanInvoiceRow => {
        const owner = employees.find((e) => e.companyId === i.companyId && e.role === "MANAGER");
        return {
          ...i, planName: subs.find((x) => x.id === i.subscriptionId)?.planName ?? null,
          ownerName: owner?.name ?? null, ownerEmail: owner ? maskEmail(owner.email) : null,
          lastSentAt: activity.filter((a) => a.companyId === i.companyId && a.action.startsWith(`${INVOICE_RESENT_ACTION} ${i.number}`)).map((a) => a.at).sort().at(-1) ?? null,
        };
      })
      .filter((i) =>
        (!f.from || i.issuedAt.slice(0, 10) >= f.from) && (!f.to || i.issuedAt.slice(0, 10) <= f.to) &&
        hit(i.number, i.companyName, i.planName, i.amount));
  },

  unpaid(q?: string, f: { status?: "past_due" | "suspended"; urgency?: Urgency } = {}, now: Date = new Date()): UnpaidOwnerRow[] {
    const hit = matcher(q);
    const { employees, subscriptions, activity } = getStore();
    return subscriptionsRepo.unpaidQueue(now)
      .map((r): UnpaidOwnerRow => {
        const owner = employees.find((e) => e.companyId === r.companyId && e.role === "MANAGER");
        return {
          ...r, ownerName: owner?.name ?? null,
          ownerEmail: owner ? maskEmail(owner.email) : null, ownerPhone: owner ? maskPhone(owner.phone) : null,
          nextBillingDate: subscriptions.find((x) => x.id === r.id)?.nextBillingDate ?? r.pastDueSince,
          lastReminderAt: activity.filter((a) => a.companyId === r.companyId && a.action.startsWith(REMINDER_ACTION)).map((a) => a.at).sort().at(-1) ?? null,
          delayDays: r.deadline === "suspension" ? SUSPENSION_DELAY_DAYS : EXPIRATION_DELAY_DAYS,
          urgency: urgencyOf(r.daysLeft),
        };
      })
      .filter((r) => (!f.status || r.status === f.status) && (!f.urgency || r.urgency === f.urgency) && hit(r.companyName, r.ownerName, r.planName, r.price));
  },

  /** Number of matches in every tab (the totals when there is no query). */
  counts(q?: string): Record<HubTab, number> {
    return {
      plans: hubRepo.plans(q).length, fonctionnalites: hubRepo.features(q).length, paliers: hubRepo.tiers(q).length,
      documents: hubRepo.kycTypes(q).length, abonnements: hubRepo.subscriptions(q).length,
      paiements: hubRepo.payments(q).length, factures: hubRepo.invoices(q).length, impayes: hubRepo.unpaid(q).length,
    };
  },
};
