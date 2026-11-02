import { apiRepo, servicesRepo } from "@/lib/repos/monitoring";
import { onlineRepo } from "@/lib/repos/sales";
import { getStore } from "@/lib/repos/store";
import type { ActivityEntry, DsrType, Incident, ServiceHealth, Subscription } from "@/lib/types";

export interface Overview {
  kpis: {
    companies: number; active: number; draft: number;
    pastDue: number; openIncidents: number; pendingKyc: number;
  };
  services: ServiceHealth[];
  incidents: Incident[];
  pastDue: (Subscription & { companyName: string })[];
  dsr: { id: string; requestType: DsrType; requesterName: string; dueDate: string; daysLeft: number }[];
  activity: (ActivityEntry & { companyName: string | null })[];
}

const DAY = 86_400_000;

export const dashboardRepo = {
  overview(now: Date = new Date()): Overview {
    const s = getStore();
    const name = (id: string | null) =>
      id ? (s.companies.find((c) => c.id === id)?.name ?? null) : null;
    const pastDue = s.subscriptions
      .filter((x) => x.status === "past_due")
      .map((x) => ({ ...x, companyName: name(x.companyId) ?? "—" }));
    return {
      kpis: {
        companies: s.companies.length,
        active: s.companies.filter((c) => c.status === "active").length,
        draft: s.companies.filter((c) => c.status === "draft").length,
        pastDue: pastDue.length,
        openIncidents: s.systemIncidents.filter((i) => i.status !== "RESOLVED").length,
        pendingKyc: s.documents.filter((d) => d.status === "pending").length,
      },
      services: servicesRepo.latestLive(),
      incidents: s.systemIncidents
        .filter((i) => i.status !== "RESOLVED")
        .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt))
        .map((i): Incident => ({
          id: i.id, code: i.incidentCode, title: i.title, serviceName: i.serviceName, severity: i.severity,
          status: i.status, detectedAt: i.detectedAt,
        })),
      pastDue,
      dsr: s.dataSubjectRequests
        .filter((d) => d.status === "RECEIVED" || d.status === "IN_PROGRESS")
        .map((d) => ({
          id: d.id, requestType: d.requestType, dueDate: d.dueDate,
          requesterName: s.users.find((u) => u.id === d.requesterUserId)?.displayName ?? "—",
          daysLeft: Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / DAY),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
      activity: s.activity
        .filter((a) => a.scope !== "backoffice")
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8)
        .map((a) => ({ ...a, companyName: name(a.companyId) })),
    };
  },
};

const HOME_DAYS = 14;

export interface HomeData {
  generatedAt: string;
  kpis: {
    mrr: number; mrrActiveSubscriptions: number;
    revenue30d: number; revenueDeltaPercent: number | null;
    bookings30d: number; bookingsDeltaPercent: number | null;
    activeCompanies: number; totalCompanies: number;
    parcelsInTransit: number; parcelsTotal: number;
    activeBuses: number; totalBuses: number; busesInMaintenance: number;
    activeUsers: number; customers: number;
    apiRequests7d: number; apiErrorPercent: number;
  };
  series: { day: string; bookings: number; revenue: number }[];
  api: { day: string; ok: number; clientErrors: number; serverErrors: number }[];
  companiesByStatus: { label: string; value: number; tone: "success" | "info" | "warning" | "danger" }[];
  parcelsByStatus: { label: string; value: number; tone: "success" | "info" | "warning" | "danger" | "neutral" }[];
  channels: { label: string; value: number }[];
  topCompanies: { id: string; name: string; revenue: number; bookings: number }[];
  attention: { key: string; label: string; count: number; href: string; tone: "danger" | "warning" | "info" }[];
  services: ServiceHealth[];
  incidents: Incident[];
  activity: (ActivityEntry & { companyName: string | null })[];
  upcomingTrips: { id: string; label: string; companyName: string; departure: string; availableSeats: number; totalSeats: number }[];
  recentBookings: { id: string; code: string; passenger: string; companyName: string; amount: number; currency: string; paymentStatus: string; channel: string; createdAt: string }[];
  pendingKyc: { id: string; companyId: string; companyName: string; typeName: string; uploadedAt: string }[];
  dsr: Overview["dsr"];
  plansMix: { label: string; value: number }[];
}

const pct = (now: number, before: number): number | null =>
  before === 0 ? null : Math.round(((now - before) / before) * 100);

export function homeData(now: Date = new Date()): HomeData {
  const s = getStore();
  const base = dashboardRepo.overview(now);
  const dayOf = (d: Date) => d.toISOString().slice(0, 10);
  const since = (days: number) => now.getTime() - days * DAY;
  const inWindow = (iso: string, from: number, to: number) => {
    const t = Date.parse(iso);
    return t > from && t <= to;
  };
  const paidXof = s.bookings.filter((b) => b.paymentStatus === "paid" && b.currency === "XOF");
  const rev = (from: number, to: number) =>
    paidXof.filter((b) => inWindow(b.createdAt, from, to)).reduce((n, b) => n + b.amount, 0);
  const cnt = (from: number, to: number) => s.bookings.filter((b) => inWindow(b.createdAt, from, to)).length;

  const revenue30d = rev(since(30), now.getTime());
  const bookings30d = cnt(since(30), now.getTime());
  const activeSubs = s.subscriptions.filter((x) => x.status === "active" && x.currency === "XOF");
  const mrr = activeSubs.reduce((n, x) => n + (x.billingCycle === "YEARLY" ? x.price / 12 : x.price), 0);

  const days = Array.from({ length: HOME_DAYS }, (_, i) => dayOf(new Date(now.getTime() - (HOME_DAYS - 1 - i) * DAY)));
  const series = days.map((day) => {
    const of = s.bookings.filter((b) => b.createdAt.slice(0, 10) === day);
    return {
      day, bookings: of.length,
      revenue: of.filter((b) => b.paymentStatus === "paid" && b.currency === "XOF").reduce((n, b) => n + b.amount, 0),
    };
  });

  const api = apiRepo.summary({ days: 7 }, now);
  const companyStatus = (st: string) => s.companies.filter((c) => c.status === st).length;
  const parcelCount = (...st: string[]) => s.parcels.filter((p) => st.includes(p.status)).length;
  const overdueDsr = base.dsr.filter((d) => d.daysLeft < 0).length;
  const online = onlineRepo.stats(now);

  const byCompany = new Map<string, { revenue: number; bookings: number }>();
  for (const b of s.bookings.filter((x) => inWindow(x.createdAt, since(30), now.getTime()))) {
    const cur = byCompany.get(b.companyId) ?? { revenue: 0, bookings: 0 };
    cur.bookings += 1;
    if (b.paymentStatus === "paid" && b.currency === "XOF") cur.revenue += b.amount;
    byCompany.set(b.companyId, cur);
  }

  return {
    generatedAt: now.toISOString(),
    kpis: {
      mrr: Math.round(mrr), mrrActiveSubscriptions: activeSubs.length,
      revenue30d, revenueDeltaPercent: pct(revenue30d, rev(since(60), since(30))),
      bookings30d, bookingsDeltaPercent: pct(bookings30d, cnt(since(60), since(30))),
      activeCompanies: companyStatus("active"), totalCompanies: s.companies.length,
      parcelsInTransit: parcelCount("IN_TRANSIT", "AT_HUB"), parcelsTotal: s.parcels.length,
      activeBuses: s.buses.filter((b) => b.status === "active").length, totalBuses: s.buses.length,
      busesInMaintenance: s.buses.filter((b) => b.status === "maintenance").length,
      activeUsers: s.users.filter((u) => u.status === "active").length, customers: s.customers.length,
      apiRequests7d: api.totals.count,
      apiErrorPercent: Math.round((api.totals.clientErrorPercent + api.totals.serverErrorPercent) * 10) / 10,
    },
    series,
    api: api.byDay,
    companiesByStatus: [
      { label: "Actives", value: companyStatus("active"), tone: "success" },
      { label: "Brouillon", value: companyStatus("draft"), tone: "info" },
      { label: "Suspendues", value: companyStatus("suspended"), tone: "warning" },
      { label: "Fermées", value: companyStatus("closed"), tone: "danger" },
    ],
    parcelsByStatus: [
      { label: "En attente", value: parcelCount("PENDING"), tone: "neutral" },
      { label: "En transit", value: parcelCount("IN_TRANSIT", "AT_HUB"), tone: "info" },
      { label: "Livrés", value: parcelCount("DELIVERED"), tone: "success" },
      { label: "Retournés", value: parcelCount("RETURNED", "CANCELLED"), tone: "warning" },
      { label: "Perdus", value: parcelCount("LOST"), tone: "danger" },
    ],
    channels: [
      { label: "Guichet", value: s.bookings.filter((b) => b.channel === "counter").length },
      { label: "En ligne", value: s.bookings.filter((b) => b.channel === "online").length },
    ],
    topCompanies: [...byCompany.entries()]
      .map(([id, v]) => ({ id, name: s.companies.find((c) => c.id === id)?.name ?? "—", ...v }))
      .sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings || a.name.localeCompare(b.name))
      .slice(0, 5),
    attention: [
      { key: "incidents", label: "Incidents ouverts", count: base.kpis.openIncidents, href: "/supervision/incidents", tone: "danger" as const },
      { key: "pastdue", label: "Abonnements impayés", count: base.kpis.pastDue, href: "/offre-facturation/impayes", tone: "danger" as const },
      { key: "dsr", label: "Demandes RGPD en retard", count: overdueDsr, href: "/conformite/demandes-rgpd", tone: "danger" as const },
      { key: "kyc", label: "Documents KYC à revoir", count: base.kpis.pendingKyc, href: "/compagnies/kyc", tone: "warning" as const },
      { key: "expiring", label: "Réservations en ligne qui expirent", count: online.expiring.length, href: "/ventes/en-ligne", tone: "warning" as const },
      { key: "stuck", label: "Paiements bloqués", count: online.stuck, href: "/ventes/paiements", tone: "info" as const },
    ].filter((x) => x.count > 0),
    services: base.services,
    incidents: base.incidents.slice(0, 4),
    activity: base.activity.slice(0, 6),
    upcomingTrips: s.trips
      .filter((t) => (t.status === "planned" || t.status === "boarding") && Date.parse(t.departure) >= now.getTime())
      .sort((a, b) => a.departure.localeCompare(b.departure) || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map((t) => {
        const r = s.routes.find((x) => x.id === t.routeId);
        const city = (id?: string) => s.stations.find((x) => x.id === id)?.city ?? "—";
        return {
          id: t.id, label: `${city(r?.originId)} → ${city(r?.destinationId)}`,
          companyName: s.companies.find((c) => c.id === t.companyId)?.name ?? "—",
          departure: t.departure, availableSeats: t.availableSeats, totalSeats: t.totalSeats,
        };
      }),
    recentBookings: [...s.bookings]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .slice(0, 6)
      .map((b) => ({
        id: b.id, code: b.bookingCode, passenger: b.passengerName,
        companyName: s.companies.find((c) => c.id === b.companyId)?.name ?? "—",
        amount: b.amount, currency: b.currency, paymentStatus: b.paymentStatus, channel: b.channel, createdAt: b.createdAt,
      })),
    pendingKyc: s.documents
      .filter((x) => x.status === "pending")
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt) || a.id.localeCompare(b.id))
      .slice(0, 5)
      .map((x) => ({
        id: x.id, companyId: x.companyId, typeName: x.typeName, uploadedAt: x.uploadedAt,
        companyName: s.companies.find((c) => c.id === x.companyId)?.name ?? "—",
      })),
    dsr: base.dsr.slice(0, 4),
    plansMix: [...new Set(activeSubs.map((x) => x.planName))].sort()
      .map((label) => ({ label, value: activeSubs.filter((x) => x.planName === label).length })),
  };
}
