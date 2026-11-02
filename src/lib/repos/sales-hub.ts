import { routeLabel } from "@/lib/repos/fleet";
import {
  bookingsRepo, onlineRepo, paymentMethodsRepo, ticketsRepo, transactionsRepo,
  type BookingRow, type OnlineStats, type PaymentMethodRow, type TicketRow, type TransactionRow,
} from "@/lib/repos/sales";
import { getStore } from "@/lib/repos/store";
import type { BookingChannel, BookingPaymentStatus, BookingStatus, TicketStatus, TransactionStatus } from "@/lib/types";

export const SALES_TABS = ["apercu", "reservations", "paiements", "billets", "moyens-de-paiement", "en-ligne"] as const;
export type SalesTab = (typeof SALES_TABS)[number];
export const PERIODS = [7, 30, 90] as const;
const DAY = 86_400_000;

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}
type Co = { companyId?: string };

export interface SalesOverview {
  days: number;
  revenue: number; revenueDelta: number | null; bookings: number; bookingsDelta: number | null;
  average: number; conversion: number | null; currency: string;
  series: { day: string; bookings: number; revenue: number }[];
  funnel: { label: string; value: number }[];
  channels: { label: string; value: number }[];
  topRoutes: { label: string; revenue: number; bookings: number }[];
  heat: { day: string; cells: number[] }[]; heatMax: number;
  insights: string[];
  feed: { id: string; at: string; label: string; detail: string; tone: "success" | "warning" | "danger" | "info"; href: string }[];
  alerts: { key: string; label: string; count: number; href: string; tone: "danger" | "warning" | "info" }[];
}

const WEEKDAYS = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
const PARTS = ["Nuit", "Matin", "Après-midi", "Soir"];

export const salesHubRepo = {
  bookings(q?: string, f: Co & { status?: BookingStatus; paymentStatus?: BookingPaymentStatus; channel?: BookingChannel } = {}): BookingRow[] {
    const hit = matcher(q);
    return bookingsRepo.listRows(f).filter((b) => hit(b.bookingCode, b.passengerName, b.companyName, b.routeLabel, b.seatNumber, b.amount));
  },
  transactions(q?: string, f: Co & { status?: TransactionStatus; anomalyOnly?: boolean } = {}, now: Date = new Date()): TransactionRow[] {
    const hit = matcher(q);
    return transactionsRepo.listRows(f, now).filter((t) => hit(t.reference, t.bookingCode, t.passengerName, t.companyName, t.methodName, t.amount));
  },
  tickets(q?: string, f: Co & { status?: TicketStatus } = {}): TicketRow[] {
    const hit = matcher(q);
    return ticketsRepo.listRows(f).filter((t) => hit(t.ticketCode, t.bookingCode, t.passengerName, t.companyName, t.routeLabel, t.seatNumber));
  },
  methods(q?: string, f: Co = {}): PaymentMethodRow[] {
    const hit = matcher(q);
    return paymentMethodsRepo.listRows(f).filter((m) => hit(m.name, m.provider, m.companyName));
  },
  online(now: Date = new Date()): OnlineStats {
    return onlineRepo.stats(now);
  },

  counts(q?: string, f: Co = {}): Record<SalesTab, number> {
    return {
      apercu: 0, reservations: salesHubRepo.bookings(q, f).length, paiements: salesHubRepo.transactions(q, f).length,
      billets: salesHubRepo.tickets(q, f).length, "moyens-de-paiement": salesHubRepo.methods(q, f).length,
      "en-ligne": salesHubRepo.online().expiring.filter((e) => matcher(q)(e.bookingCode, e.passengerName, e.companyName)).length,
    };
  },

  overview(days: number, f: Co = {}, now: Date = new Date()): SalesOverview {
    const s = getStore();
    const mine = <T extends { companyId: string }>(l: T[]) => l.filter((x) => !f.companyId || x.companyId === f.companyId);
    const bookings = mine(s.bookings);
    const to = now.getTime();
    const from = to - days * DAY;
    const inRange = (iso: string, a: number, b: number) => { const t = Date.parse(iso); return t > a && t <= b; };
    const current = bookings.filter((b) => inRange(b.createdAt, from, to));
    const previous = bookings.filter((b) => inRange(b.createdAt, from - days * DAY, from));
    const paid = (l: typeof bookings) => l.filter((b) => b.paymentStatus === "paid" && b.currency === "XOF");
    const sum = (l: typeof bookings) => l.reduce((n, b) => n + b.amount, 0);
    const pct = (a: number, b: number): number | null => (b === 0 ? null : Math.round(((a - b) / b) * 100));
    const revenue = sum(paid(current));
    const paidCount = paid(current).length;

    const dayKeys = Array.from({ length: days }, (_, i) => new Date(to - (days - 1 - i) * DAY).toISOString().slice(0, 10));
    const series = dayKeys.map((day) => {
      const of = current.filter((b) => b.createdAt.slice(0, 10) === day);
      return { day, bookings: of.length, revenue: sum(paid(of)) };
    });

    const tickets = mine(s.tickets).filter((t) => inRange(t.issuedAt, from, to));
    const funnel = [
      { label: "Réservations créées", value: current.length },
      { label: "Réservations payées", value: current.filter((b) => b.paymentStatus === "paid").length },
      { label: "Billets émis", value: tickets.length },
      { label: "Billets utilisés", value: tickets.filter((t) => t.status === "CHECKED_IN" || t.status === "USED").length },
    ];

    const byRoute = new Map<string, { revenue: number; bookings: number }>();
    for (const b of current) {
      const trip = s.trips.find((t) => t.id === b.tripId);
      const label = trip ? routeLabel(trip.routeId) : "—";
      const cur = byRoute.get(label) ?? { revenue: 0, bookings: 0 };
      cur.bookings += 1;
      if (b.paymentStatus === "paid" && b.currency === "XOF") cur.revenue += b.amount;
      byRoute.set(label, cur);
    }
    const topRoutes = [...byRoute.entries()].map(([label, v]) => ({ label, ...v })).sort((a, b) => b.revenue - a.revenue || b.bookings - a.bookings).slice(0, 5);

    const grid = WEEKDAYS.map(() => [0, 0, 0, 0]);
    for (const b of current) {
      const d = new Date(b.createdAt);
      const part = Math.floor(d.getUTCHours() / 6);
      grid[d.getUTCDay()]![part]! += 1;
    }
    const order = [1, 2, 3, 4, 5, 6, 0];
    const heat = order.map((i) => ({ day: WEEKDAYS[i]!, cells: grid[i]! }));
    const heatMax = Math.max(1, ...grid.flat());

    // A few readable facts drawn from the figures above.
    const insights: string[] = [];
    const bestDay = [...series].sort((a, b) => b.revenue - a.revenue)[0];
    if (bestDay && bestDay.revenue > 0) insights.push(`Meilleure journée : ${new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(bestDay.day))}.`);
    if (topRoutes[0]) insights.push(`Ligne la plus rentable : ${topRoutes[0].label}.`);
    let peak = { d: 0, p: 0, n: -1 };
    grid.forEach((row, d) => row.forEach((n, p) => { if (n > peak.n) peak = { d, p, n }; }));
    if (peak.n > 0) insights.push(`Pic de réservations : ${WEEKDAYS[peak.d]!.toLowerCase()} ${PARTS[peak.p]!.toLowerCase()}.`);
    const online = current.filter((b) => b.channel === "online").length;
    if (current.length) insights.push(`${Math.round((online / current.length) * 100)} % des réservations viennent du libre-service en ligne.`);

    const feed = [
      ...[...bookings].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 8).map((b) => ({
        id: `b-${b.id}`, at: b.createdAt, label: `Réservation ${b.bookingCode}`, detail: b.passengerName,
        tone: (b.paymentStatus === "paid" ? "success" : b.paymentStatus === "failed" ? "danger" : "warning") as "success" | "warning" | "danger",
        href: `/ventes/reservations/${b.id}`,
      })),
    ].slice(0, 8);

    const stats = onlineRepo.stats(now);
    const txs = transactionsRepo.listRows({ companyId: f.companyId }, now);
    return {
      days, revenue, revenueDelta: pct(revenue, sum(paid(previous))), bookings: current.length, bookingsDelta: pct(current.length, previous.length),
      average: paidCount ? Math.round(revenue / paidCount) : 0, conversion: current.length ? Math.round((current.filter((b) => b.paymentStatus === "paid").length / current.length) * 100) : null,
      currency: "XOF", series, funnel,
      channels: [{ label: "Guichet", value: current.filter((b) => b.channel === "counter").length }, { label: "En ligne", value: online }],
      topRoutes, heat, heatMax, insights, feed,
      alerts: [
        { key: "stuck", label: "Paiements bloqués", count: txs.filter((t) => t.anomalies.includes("STUCK")).length, href: "/ventes/paiements?anomalie=oui", tone: "danger" as const },
        { key: "mismatch", label: "Montants incohérents", count: txs.filter((t) => t.anomalies.includes("AMOUNT_MISMATCH")).length, href: "/ventes/paiements?anomalie=oui", tone: "danger" as const },
        { key: "ticket", label: "Billets manquants", count: txs.filter((t) => t.anomalies.includes("MISSING_TICKET")).length, href: "/ventes/paiements?anomalie=oui", tone: "warning" as const },
        { key: "expiring", label: "Réservations en ligne qui expirent", count: stats.expiring.length, href: "/ventes/en-ligne", tone: "info" as const },
      ].filter((a) => a.count > 0),
    };
  },
};
