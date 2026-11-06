import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { userNames, toAuditRow } from "@/lib/api/comp-live";
import { liveCampaigns, liveMessages, liveSchedules, liveSegments } from "@/lib/api/comm-live";
import { ApiError } from "@/lib/api/http";
import { toSubscription } from "@/lib/api/billing-live";
import { arr, call, num, obj, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import type { AuditChange, AuditDetail } from "@/lib/repos/compliance";
import type { CampaignDetail } from "@/lib/repos/communication";
import type { PlanDetail } from "@/lib/repos/billing";
import type { FeatureDef } from "@/lib/types";

async function detailOf(path: string): Promise<unknown | null> {
  try {
    return await call<unknown>(path);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

/** Before/after states are JSON objects of plain values: compare them key by key. */
export function toChanges(before: unknown, after: unknown): AuditChange[] {
  const parse = (v: unknown): Record<string, string> => {
    let value = v;
    if (typeof v === "string") {
      try { value = JSON.parse(v); } catch { return {}; }
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};
    return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, x]) => [k, x === null ? "" : String(x)]));
  };
  const b = parse(before), a = parse(after);
  return [...new Set([...Object.keys(b), ...Object.keys(a)])].sort().map((key) => ({
    key, before: key in b ? b[key]! || null : null, after: key in a ? a[key]! || null : null, changed: (b[key] ?? null) !== (a[key] ?? null),
  }));
}

export async function liveAuditDetail(id: string): Promise<AuditDetail | null> {
  const raw = await detailOf(`/admin/audit-logs/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const d = obj(raw), log = obj(d.log);
  const [companies, users] = await Promise.all([companyNames(), userNames([str(log.actorUserId)])]);
  const row = toAuditRow(log, companies, users);
  return {
    row, entityId: row.entityRef, userAgent: str(d.userAgent, "—"), occurredAt: strOrNull(log.occurredAt), changes: toChanges(d.beforeState, d.afterState),
  };
}

export async function livePlanDetail(id: string): Promise<PlanDetail | null> {
  const raw = await detailOf(`/plans/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const p = obj(raw);
  const [limit, links, featuresAll, subs] = await Promise.all([
    soft<unknown>(`/plans/${encodeURIComponent(id)}/limit`), soft<unknown>(`/plans/${encodeURIComponent(id)}/features`),
    loadAll("/features", new URLSearchParams()), loadAll("/admin/billing/subscriptions", withFilters({})),
  ]);
  const byId = new Map(featuresAll.map(obj).map((f) => [str(f.id), f] as const));
  const linked = (Array.isArray(links) ? links : []).map(obj).filter((l) => l.isEnabled !== false).map((l) => byId.get(str(l.featureId))).filter((f): f is Record<string, unknown> => !!f);
  const features: FeatureDef[] = linked.map((f) => ({ code: str(f.code), name: str(f.name, "—"), kind: str(f.featureType).toUpperCase() === "BOOLEAN" ? "boolean" : "quota" }));
  const lim = obj(limit);
  const rows = subs.filter((r) => str(obj(r).planId) === id).map(toSubscription);
  return {
    plan: {
      id: str(p.id), code: str(p.code) || "—", name: str(p.name, "—"), priceMonthly: num(p.priceMonthly), priceYearly: num(p.priceYearly), setupFee: num(p.setupFee),
      currency: str(p.currency, "XOF"), trialDays: num(p.trialDays), status: str(p.status).toUpperCase() === "INACTIVE" ? "inactive" : "active",
      limits: { maxUsers: num(lim.maxUsers), maxBuses: num(lim.maxBuses) }, featureCodes: features.map((f) => f.code),
    },
    features,
    subscriptions: rows.map((s) => ({ id: s.id, companyId: s.companyId, planName: s.planName, status: s.status, billingCycle: s.billingCycle, price: s.price, currency: s.currency, nextBillingDate: s.nextBillingDate, companyName: s.companyName })),
  };
}

export async function liveCampaignDetail(id: string): Promise<CampaignDetail | null> {
  const all = await liveCampaigns({}).catch(() => []);
  const c = all.find((x) => x.id === id);
  if (!c) return null;
  const [segments, messages, schedules] = await Promise.all([
    liveSegments({ companyId: c.companyId }), liveMessages({ companyId: c.companyId }), liveSchedules({ companyId: c.companyId }),
  ]);
  void arr;
  const blocked = c.status === "CANCELLED" ? "La campagne est déjà annulée" : c.status === "COMPLETED" ? "Une campagne terminée ne peut plus être annulée" : null;
  return {
    campaign: {
      id: c.id, companyId: c.companyId, name: c.name, objective: c.objective ?? "ACQUISITION", status: c.status, startDate: c.startDate ?? "", endDate: c.endDate ?? "",
      budget: c.budget ?? 0, currency: c.currency, createdByUserId: null, createdAt: c.createdAt, updatedAt: null,
    },
    companyName: c.companyName, createdByName: "—",
    segments: segments.filter((s) => s.campaignName === c.name), messages: messages.filter((m) => m.campaignId === id), schedules: schedules.filter((s) => s.campaignId === id),
    cancelBlockedReason: blocked,
  };
}
