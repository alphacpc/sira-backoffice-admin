import { redirect } from "next/navigation";
import { backendToken } from "@/lib/api/backend-session";
import { ApiError, apiCall } from "@/lib/api/http";
import { requireSession } from "@/lib/auth/session";
import type { DashData, FunnelStep, ParetoResult } from "@/lib/repos/dashboard-hub";

/** Shape of GET /admin/dashboard (admin-bff-service). A section whose source failed is null and listed in warnings. */
interface Bff {
  days: number; from: string; to: string; generatedAt: string;
  kpis: {
    revenue: number | null; revenueDelta: number | null; bookings: number | null; bookingsDelta: number | null;
    cancelRate: number | null; paymentRate: number | null; paymentRateDelta: number | null;
    avgBasket: number | null; avgBasketDelta: number | null; occupancy: number | null;
    deliveryRate: number | null; busUtilisation: number | null;
  } | null;
  base: {
    kpis: {
      mrr: number | null; mrrActiveSubscriptions: number | null; activeCompanies: number | null; totalCompanies: number | null;
      parcelsInTransit: number | null; activeBuses: number | null; totalBuses: number | null; busesInMaintenance: number | null;
    } | null;
    attention: { key: string; label: string; count: number; href: string; tone: "danger" | "warning" | "info" }[] | null;
  } | null;
  series: { day: string; bookings: number; paid: number; revenue: number }[] | null;
  funnel: FunnelStep[] | null;
  paretoRevenue: ParetoResult | null; paretoErrors: ParetoResult | null; paretoFailures: ParetoResult | null;
  heat: DashData["heat"] | null;
  parcels: DashData["parcels"] | null;
  onlineExpiring: number | null;
  mon: {
    metrics: { name: string; status: "healthy" | "degraded" | "down"; stale: boolean; responseTimeMs: number | null; uptimePercent: number | null; states: { at: string; status: "healthy" | "degraded" | "down"; ms: number | null }[] }[] | null;
    api: { totals: { availability: number | null } | null; byDay: { day: string; err5: number | null }[] | null } | null;
    incidents: { open: number | null; mttrMinutes: number | null } | null;
  } | null;
  incidents: DashData["base"]["incidents"] | null;
  upcomingTrips: DashData["base"]["upcomingTrips"] | null;
  recentBookings: (Omit<DashData["base"]["recentBookings"][number], "amount"> & { amount: number | string })[] | null;
  pendingKyc: DashData["base"]["pendingKyc"] | null;
  dsr: DashData["base"]["dsr"] | null;
  plansMix: DashData["base"]["plansMix"] | null;
  activity: { id: string; at: string; actor: string | null; action: string; companyName: string | null }[] | null;
  warnings: { section: string; reason: string }[];
}

const EMPTY_PARETO: ParetoResult = { items: [], total: 0, vitalFew: 0, vitalShare: 0, topShare: 0 };
const n = (v: number | null | undefined): number => v ?? 0;

export function fromBff(b: Bff): DashData {
  const k = b.kpis;
  const bk = b.base?.kpis;
  const m = b.mon;
  return {
    days: b.days, from: b.from, to: b.to,
    base: {
      generatedAt: b.generatedAt,
      kpis: {
        mrr: n(bk?.mrr), mrrActiveSubscriptions: n(bk?.mrrActiveSubscriptions), activeCompanies: n(bk?.activeCompanies),
        totalCompanies: n(bk?.totalCompanies), parcelsInTransit: n(bk?.parcelsInTransit), activeBuses: n(bk?.activeBuses),
        totalBuses: n(bk?.totalBuses), busesInMaintenance: n(bk?.busesInMaintenance),
      },
      attention: b.base?.attention ?? [],
      incidents: b.incidents ?? [],
      activity: (b.activity ?? []).map((a) => ({ id: a.id, companyId: null, at: a.at, actor: a.actor ?? "—", action: a.action, companyName: a.companyName })),
      upcomingTrips: b.upcomingTrips ?? [],
      recentBookings: (b.recentBookings ?? []).map((r) => ({ ...r, amount: Number(r.amount) })),
      pendingKyc: (b.pendingKyc ?? []).map((x) => ({ ...x, uploadedAt: x.uploadedAt ?? "" })),
      dsr: b.dsr ?? [],
      plansMix: b.plansMix ?? [],
    },
    mon: {
      metrics: (m?.metrics ?? []).map((x) => ({
        name: x.name, status: x.status, stale: x.stale, responseTimeMs: n(x.responseTimeMs), uptimePercent: x.uptimePercent,
        states: x.states.map((s) => ({ at: s.at, status: s.status, ms: n(s.ms) })),
      })),
      api: { totals: { availability: m?.api?.totals?.availability ?? null }, byDay: (m?.api?.byDay ?? []).map((x) => ({ err5: n(x.err5) })) },
      incidents: { open: n(m?.incidents?.open), mttrMinutes: m?.incidents?.mttrMinutes ?? null },
    },
    kpis: {
      revenue: n(k?.revenue), revenueDelta: k?.revenueDelta ?? null, bookings: n(k?.bookings), bookingsDelta: k?.bookingsDelta ?? null,
      paymentRate: k?.paymentRate ?? null, paymentRateDelta: k?.paymentRateDelta ?? null, avgBasket: n(k?.avgBasket),
      avgBasketDelta: k?.avgBasketDelta ?? null, occupancy: k?.occupancy ?? null, deliveryRate: k?.deliveryRate ?? null,
      busUtilisation: k?.busUtilisation ?? null, cancelRate: k?.cancelRate ?? null,
    },
    series: b.series ?? [],
    funnel: b.funnel ?? [],
    paretoRevenue: b.paretoRevenue ?? EMPTY_PARETO,
    paretoErrors: b.paretoErrors ?? EMPTY_PARETO,
    paretoFailures: b.paretoFailures ?? EMPTY_PARETO,
    heat: b.heat ?? [],
    parcels: b.parcels ?? { stages: [], late: 0, total: 0 },
    onlineExpiring: n(b.onlineExpiring),
  };
}

export async function liveDashData(days: number): Promise<DashData> {
  try {
    const session = await requireSession();
    const token = await backendToken(session.sid);
    return fromBff(await apiCall<Bff>(`/admin/dashboard?days=${days}`, { token }));
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) redirect("/session-expiree");
    throw e;
  }
}
