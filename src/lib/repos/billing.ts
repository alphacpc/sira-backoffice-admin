import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import type {
  FeatureDef, KycDocumentType, PartnerTier, Plan, Subscription, SubscriptionStatus,
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
