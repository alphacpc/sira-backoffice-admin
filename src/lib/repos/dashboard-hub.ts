import { onlineRepo } from "@/lib/repos/sales";
import { homeData, type HomeData } from "@/lib/repos/dashboard";
import { monOverview, type ServiceMetric } from "@/lib/repos/monitoring-hub";
import { getStore } from "@/lib/repos/store";

export const DASH_WINDOWS = [7, 14, 30] as const;
const DAY = 86_400_000;
const r1 = (n: number) => Math.round(n * 10) / 10;
const pct = (a: number, b: number): number | null => (b === 0 ? null : Math.round(((a - b) / b) * 100));

export interface ParetoItem { label: string; value: number; cumPct: number; sharePct: number; href?: string }
export interface ParetoResult { items: ParetoItem[]; total: number; vitalFew: number; vitalShare: number; topShare: number }

/** Sorts descending and accumulates: the vital few are the items that reach 80 % of the total. */
export function pareto(input: { label: string; value: number; href?: string }[], maxItems = 10): ParetoResult {
  const sorted = input.filter((i) => i.value > 0).sort((a, b) => b.value - a.value || a.label.localeCompare(b.label));
  const total = sorted.reduce((n, i) => n + i.value, 0);
  let acc = 0;
  const all = sorted.map((i): ParetoItem => {
    acc += i.value;
    return { label: i.label, value: i.value, href: i.href, sharePct: total ? r1((i.value / total) * 100) : 0, cumPct: total ? r1((acc / total) * 100) : 0 };
  });
  const vital = all.findIndex((i) => i.cumPct >= 80) + 1 || all.length;
  const shown = all.slice(0, maxItems);
  if (all.length > maxItems) {
    const rest = all.slice(maxItems).reduce((n, i) => n + i.value, 0);
    shown.push({ label: `Autres (${all.length - maxItems})`, value: rest, sharePct: r1((rest / total) * 100), cumPct: 100 });
  }
  return { items: shown, total, vitalFew: vital, vitalShare: all.length ? Math.round((vital / all.length) * 100) : 0, topShare: all[0]?.sharePct ?? 0 };
}

export interface FunnelStep { label: string; value: number; ratePct: number | null }

/** What the dashboard page reads of the home data: the demonstration store and the platform both fill it. */
export type DashBase = Pick<HomeData, "generatedAt" | "attention" | "incidents" | "activity" | "upcomingTrips" | "recentBookings" | "pendingKyc" | "dsr" | "plansMix"> & {
  kpis: Pick<HomeData["kpis"], "mrr" | "mrrActiveSubscriptions" | "activeCompanies" | "totalCompanies" | "parcelsInTransit" | "activeBuses" | "totalBuses" | "busesInMaintenance">;
};
/** What the dashboard page reads of the monitoring overview. `availability` is null when no request was measured. */
export interface DashMon {
  metrics: Pick<ServiceMetric, "name" | "status" | "stale" | "responseTimeMs" | "uptimePercent" | "states">[];
  api: { totals: { availability: number | null }; byDay: { err5: number }[] };
  incidents: { open: number; mttrMinutes: number | null };
}

export interface DashData {
  days: number; from: string; to: string;
  base: DashBase; mon: DashMon;
  kpis: {
    revenue: number; revenueDelta: number | null; bookings: number; bookingsDelta: number | null;
    paymentRate: number | null; paymentRateDelta: number | null; avgBasket: number; avgBasketDelta: number | null;
    occupancy: number | null; deliveryRate: number | null; busUtilisation: number | null;
    cancelRate: number | null;
  };
  series: { day: string; revenue: number; bookings: number; paid: number }[];
  funnel: FunnelStep[];
  paretoRevenue: ParetoResult; paretoErrors: ParetoResult; paretoFailures: ParetoResult;
  heat: { label: string; cells: { day: string; value: number; title: string }[] }[];
  parcels: { stages: { label: string; value: number }[]; late: number; total: number };
  onlineExpiring: number;
}

export function dashData(days: number, now: Date = new Date()): DashData {
  const s = getStore();
  const base = homeData(now);
  const mon = monOverview({ days }, now);
  const dayOf = (d: Date) => d.toISOString().slice(0, 10);
  const range = Array.from({ length: days }, (_, i) => dayOf(new Date(now.getTime() - (days - 1 - i) * DAY)));
  const winSet = new Set(range);
  const prevSet = new Set(Array.from({ length: days }, (_, i) => dayOf(new Date(now.getTime() - (2 * days - 1 - i) * DAY))));
  const inWin = s.bookings.filter((b) => winSet.has(b.createdAt.slice(0, 10)));
  const inPrev = s.bookings.filter((b) => prevSet.has(b.createdAt.slice(0, 10)));
  const paidXof = (list: typeof inWin) => list.filter((b) => b.paymentStatus === "paid" && b.currency === "XOF");
  const sum = (list: typeof inWin) => list.reduce((n, b) => n + b.amount, 0);
  const revenue = sum(paidXof(inWin));
  const prevRevenue = sum(paidXof(inPrev));
  const payRate = (list: typeof inWin) => { const live = list.filter((b) => b.status !== "cancelled"); return live.length ? r1((live.filter((b) => b.paymentStatus === "paid").length / live.length) * 100) : null; };
  const basket = (list: typeof inWin) => { const p = paidXof(list); return p.length ? Math.round(sum(p) / p.length) : 0; };
  const nowPay = payRate(inWin);
  const prevPay = payRate(inPrev);

  const upcoming = s.trips.filter((t) => (t.status === "planned" || t.status === "boarding") && Date.parse(t.departure) >= now.getTime());
  const seats = upcoming.reduce((n, t) => n + t.totalSeats, 0);
  const taken = upcoming.reduce((n, t) => n + (t.totalSeats - t.availableSeats), 0);
  const closedParcels = s.parcels.filter((p) => p.status === "DELIVERED" || p.status === "LOST" || p.status === "RETURNED");
  const delivered = s.parcels.filter((p) => p.status === "DELIVERED").length;
  const company = (id: string) => s.companies.find((c) => c.id === id)?.name ?? "—";

  const live = inWin.filter((b) => b.status !== "cancelled");
  const funnelRaw = [
    { label: "Réservations créées", value: inWin.length },
    { label: "Confirmées", value: live.length },
    { label: "Payées", value: live.filter((b) => b.paymentStatus === "paid").length },
    { label: "Billet émis", value: live.filter((b) => b.ticketIssued).length },
  ];
  const funnel = funnelRaw.map((f, i): FunnelStep => ({ ...f, ratePct: i === 0 || funnelRaw[i - 1]!.value === 0 ? null : r1((f.value / funnelRaw[i - 1]!.value) * 100) }));

  const byCompany = new Map<string, number>();
  for (const b of paidXof(inWin)) byCompany.set(b.companyId, (byCompany.get(b.companyId) ?? 0) + b.amount);

  const apiRows = s.apiUsage.filter((r) => winSet.has(r.day) && r.statusClass === "5xx");
  const byEndpoint = new Map<string, number>();
  for (const r of apiRows) byEndpoint.set(`${r.method} ${r.endpoint}`, (byEndpoint.get(`${r.method} ${r.endpoint}`) ?? 0) + r.count);

  const failures = new Map<string, number>();
  for (const t of s.transactions) {
    if (t.status === "FAILED" && winSet.has((t.completedAt ?? t.createdAt).slice(0, 10))) failures.set(t.failureReason ?? "Motif non précisé", (failures.get(t.failureReason ?? "Motif non précisé") ?? 0) + 1);
  }
  for (const a of s.paymentAttempts) {
    if (a.status === "failed" && winSet.has(a.at.slice(0, 10))) failures.set(a.reason ?? "Motif non précisé", (failures.get(a.reason ?? "Motif non précisé") ?? 0) + 1);
  }

  const top = [...byCompany].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id]) => id);
  const online = onlineRepo.stats(now);
  const stages = [
    { label: "En attente", value: s.parcels.filter((p) => p.status === "PENDING").length },
    { label: "En transit", value: s.parcels.filter((p) => p.status === "IN_TRANSIT").length },
    { label: "Au hub", value: s.parcels.filter((p) => p.status === "AT_HUB").length },
    { label: "Livrés", value: delivered },
  ];

  return {
    days, from: range[0]!, to: range.at(-1)!, base, mon,
    kpis: {
      revenue, revenueDelta: pct(revenue, prevRevenue), bookings: inWin.length, bookingsDelta: pct(inWin.length, inPrev.length),
      paymentRate: nowPay, paymentRateDelta: nowPay !== null && prevPay !== null ? r1(nowPay - prevPay) : null,
      avgBasket: basket(inWin), avgBasketDelta: pct(basket(inWin), basket(inPrev)),
      occupancy: seats ? Math.round((taken / seats) * 100) : null,
      deliveryRate: closedParcels.length ? Math.round((delivered / closedParcels.length) * 100) : null,
      busUtilisation: s.buses.length ? Math.round((s.buses.filter((b) => b.status === "active").length / s.buses.length) * 100) : null,
      cancelRate: inWin.length ? r1((inWin.filter((b) => b.status === "cancelled").length / inWin.length) * 100) : null,
    },
    series: range.map((day) => {
      const of = s.bookings.filter((b) => b.createdAt.slice(0, 10) === day);
      return { day, bookings: of.length, paid: of.filter((b) => b.paymentStatus === "paid").length, revenue: paidXof(of).reduce((n, b) => n + b.amount, 0) };
    }),
    funnel,
    paretoRevenue: pareto([...byCompany].map(([id, v]) => ({ label: company(id), value: v, href: `/compagnies/${id}` }))),
    paretoErrors: pareto([...byEndpoint].map(([label, value]) => ({ label, value })), 8),
    paretoFailures: pareto([...failures].map(([label, value]) => ({ label, value })), 8),
    heat: top.map((id) => ({
      label: company(id),
      cells: range.map((day) => {
        const v = paidXof(inWin.filter((b) => b.companyId === id && b.createdAt.slice(0, 10) === day)).reduce((n, b) => n + b.amount, 0);
        return { day, value: v, title: `${day.slice(8, 10)}/${day.slice(5, 7)} · ${Math.round(v).toLocaleString("fr-FR")} XOF` };
      }),
    })),
    parcels: { stages, late: s.parcels.filter((p) => (p.status === "IN_TRANSIT" || p.status === "AT_HUB" || p.status === "PENDING") && p.expectedDeliveryAt < now.toISOString()).length, total: s.parcels.length },
    onlineExpiring: online.expiring.length,
  };
}
