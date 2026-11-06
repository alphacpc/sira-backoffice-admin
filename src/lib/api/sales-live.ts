import { redirect } from "next/navigation";
import { ApiError, apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";
import type { BookingRow, TransactionRow } from "@/lib/repos/sales";
import type { SalesOverview, SalesTab } from "@/lib/repos/sales-hub";
import type { AnomalyKind, BookingChannel, BookingPaymentStatus, BookingStatus, TransactionStatus } from "@/lib/types";

const PAGE = 100;
const MAX_PAGES = 5;

type Obj = Record<string, unknown>;
export const obj = (v: unknown): Obj => (v && typeof v === "object" && !Array.isArray(v) ? (v as Obj) : {});
export const arr = (v: unknown): Obj[] => (Array.isArray(v) ? v.map(obj) : []);
export const str = (v: unknown, d = ""): string => (typeof v === "string" ? v : d);
export const strOrNull = (v: unknown): string | null => (typeof v === "string" ? v : null);
export const num = (v: unknown, d = 0): number => {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : d;
};
export const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
};

export function pick<T extends string>(v: unknown, allowed: readonly T[], upper: boolean, fallback: T): T {
  const s = typeof v === "string" ? (upper ? v.toUpperCase() : v.toLowerCase()) : "";
  return (allowed as readonly string[]).includes(s) ? (s as T) : fallback;
}

const FAILURE_LABELS: Record<string, string> = {
  INSUFFICIENT_FUNDS: "Solde insuffisant",
  TIMEOUT: "Délai dépassé",
  PROVIDER_ERROR: "Erreur de l'opérateur",
  PROVIDER_UNAVAILABLE: "Opérateur indisponible",
  DECLINED: "Paiement refusé",
  CANCELLED_BY_USER: "Annulé par le voyageur",
  INVALID_ACCOUNT: "Compte invalide",
  LIMIT_EXCEEDED: "Plafond dépassé",
  UNKNOWN: "Cause inconnue",
};
export const failureLabel = (raw: string | null): string | null =>
  raw ? (FAILURE_LABELS[raw.toUpperCase()] ?? raw.replace(/_/g, " ").toLowerCase().replace(/^./, (c) => c.toUpperCase())) : null;

const ANOMALIES: readonly AnomalyKind[] = ["STUCK", "AMOUNT_MISMATCH", "MISSING_TICKET"];

export function toBookingRow(raw: unknown): BookingRow {
  const b = obj(raw);
  return {
    id: str(b.id), bookingCode: str(b.bookingCode, "—"), companyId: str(b.companyId), companyName: str(b.companyName, "—"),
    passengerName: str(b.passengerName, "—"), routeLabel: str(b.routeLabel, "—"), departure: str(b.departure),
    seatNumber: strOrNull(b.seatNumber), amount: num(b.amount), currency: str(b.currency, "XOF"),
    channel: pick<BookingChannel>(b.channel, ["counter", "online"], false, "counter"),
    status: pick<BookingStatus>(b.status, ["confirmed", "cancelled"], false, "confirmed"),
    paymentStatus: pick<BookingPaymentStatus>(b.paymentStatus, ["pending", "paid", "failed"], false, "pending"),
    createdAt: str(b.createdAt),
  };
}

export function toTransactionRow(raw: unknown): TransactionRow {
  const t = obj(raw);
  return {
    id: str(t.id), reference: str(t.reference, "—"), bookingId: str(t.bookingId), bookingCode: str(t.bookingCode, "—"),
    companyId: str(t.companyId), companyName: str(t.companyName, "—"), passengerName: str(t.passengerName, "—"),
    methodName: str(t.methodName, "—"), amount: num(t.amount), currency: str(t.currency, "XOF"),
    status: pick<TransactionStatus>(t.status, ["PENDING", "COMPLETED", "FAILED"], true, "PENDING"),
    failureReason: failureLabel(strOrNull(t.failureReason)), createdAt: str(t.createdAt), completedAt: strOrNull(t.completedAt),
    anomalies: Array.isArray(t.anomalies)
      ? t.anomalies.filter((a): a is AnomalyKind => typeof a === "string" && (ANOMALIES as readonly string[]).includes(a))
      : [],
  };
}

export interface BookingSummary { total: number; paid: number; online: number; paidAmount: number; currency: string }
export interface TransactionSummary { total: number; completed: number; failed: number; withAnomaly: number }

export const toBookingSummary = (raw: unknown): BookingSummary | null => {
  const s = obj(raw);
  if (!raw || typeof raw !== "object") return null;
  return { total: num(s.total), paid: num(s.paid), online: num(s.online), paidAmount: num(s.paidAmount), currency: str(s.currency, "XOF") };
};
export const toTransactionSummary = (raw: unknown): TransactionSummary | null => {
  const s = obj(raw);
  if (!raw || typeof raw !== "object") return null;
  return { total: num(s.total), completed: num(s.completed), failed: num(s.failed), withAnomaly: num(s.withAnomaly) };
};

/** Counters the backend knows; tabs without a live counter stay absent. */
export function toCounts(raw: unknown): Partial<Record<SalesTab, number>> {
  const c = obj(raw);
  return {
    reservations: num(c.reservations), paiements: num(c.paiements), billets: num(c.billets),
    "moyens-de-paiement": num(c.moyensDePaiement), "en-ligne": num(c.enLigne),
  };
}

const TONES = ["success", "warning", "danger", "info"] as const;
const ALERTS: Record<string, { label: string; href: string; tone: "danger" | "warning" | "info" }> = {
  stuck: { label: "Paiements bloqués", href: "/ventes/paiements?anomalie=oui", tone: "danger" },
  mismatch: { label: "Montants incohérents", href: "/ventes/paiements?anomalie=oui", tone: "danger" },
  ticket: { label: "Billets manquants", href: "/ventes/paiements?anomalie=oui", tone: "warning" },
  expiring: { label: "Réservations en ligne qui expirent", href: "/ventes/en-ligne", tone: "info" },
};

export function toOverview(raw: unknown, fallbackDays: number): SalesOverview {
  const o = obj(raw);
  const currency = str(o.currency, "XOF");
  const heat = arr(o.heat).map((h) => ({ day: str(h.day), cells: Array.isArray(h.cells) ? h.cells.map((n) => num(n)) : [] }));
  const heatMax = Math.max(1, num(o.heatMax), ...heat.flatMap((h) => h.cells));
  return {
    days: num(o.days, fallbackDays), revenue: num(o.revenue), revenueDelta: numOrNull(o.revenueDelta),
    bookings: num(o.bookings), bookingsDelta: numOrNull(o.bookingsDelta), average: num(o.average),
    conversion: numOrNull(o.conversion), currency,
    series: arr(o.series).map((p) => ({ day: str(p.day), bookings: num(p.bookings), revenue: num(p.revenue) })),
    funnel: arr(o.funnel).map((f) => ({ label: str(f.label), value: num(f.value) })),
    channels: arr(o.channels).map((c) => ({ label: str(c.label), value: num(c.value) })),
    // The backend ranks trips, not lines: the label falls back to a short trip id.
    topRoutes: arr(o.topTrips).map((t) => ({
      label: str(t.routeLabel) || (str(t.tripId) ? `Trajet ${str(t.tripId).slice(0, 8)}` : "—"),
      revenue: num(t.revenue), bookings: num(t.bookings),
    })),
    heat, heatMax,
    insights: [],
    feed: arr(o.feed).map((f, i) => {
      const tone = str(f.tone);
      return {
        id: str(f.id) || `f-${i}`, at: str(f.at), label: str(f.label, "Réservation"), detail: str(f.detail),
        tone: (TONES as readonly string[]).includes(tone) ? (tone as (typeof TONES)[number]) : "info",
        // Booking detail pages are not live yet: link to the list.
        href: "/ventes/reservations",
      };
    }),
    alerts: arr(o.alerts).flatMap((a) => {
      const def = ALERTS[str(a.key)];
      const count = num(a.count);
      return def && count > 0 ? [{ key: str(a.key), label: def.label, count, href: def.href, tone: def.tone }] : [];
    }),
  };
}

interface Page<T> { rows: T[]; summary: unknown }

export async function call<T>(path: string): Promise<T> {
  try {
    return await apiCall<T>(path, { token: await currentBackendToken() });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) redirect("/session-expiree");
    throw e;
  }
}

async function loadPages(path: string, params: URLSearchParams): Promise<Page<unknown>> {
  const rows: unknown[] = [];
  let summary: unknown = null;
  try {
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs = new URLSearchParams(params);
      qs.set("page", String(page));
      qs.set("size", String(PAGE));
      const res = obj(await call<unknown>(`${path}?${qs}`));
      if (page === 0) summary = res.summary ?? null;
      rows.push(...(Array.isArray(res.content) ? res.content : []));
      if (page + 1 >= num(res.totalPages, 1)) break;
    }
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) return { rows: [], summary: null };
    throw e;
  }
  return { rows, summary };
}

export const withFilters = (f: Record<string, string | undefined>) => {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(f)) if (v) qs.set(k, v);
  return qs;
};

export async function liveBookings(f: { q?: string; companyId?: string; status?: string; paymentStatus?: string; channel?: string }) {
  const r = await loadPages("/admin/sales/bookings", withFilters(f));
  return { rows: r.rows.map(toBookingRow), summary: toBookingSummary(r.summary) };
}

export async function liveTransactions(f: { q?: string; companyId?: string; status?: string; anomalyOnly?: boolean }) {
  const r = await loadPages("/admin/sales/transactions", withFilters({ ...f, anomalyOnly: f.anomalyOnly ? "true" : undefined }));
  return { rows: r.rows.map(toTransactionRow), summary: toTransactionSummary(r.summary) };
}

export async function liveOverview(days: number, companyId?: string): Promise<SalesOverview> {
  try {
    return toOverview(await call<unknown>(`/admin/sales/overview?${withFilters({ days: String(days), companyId })}`), days);
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) return toOverview(null, days);
    throw e;
  }
}

export async function liveCounts(q?: string, companyId?: string): Promise<Partial<Record<SalesTab, number>>> {
  try {
    return toCounts(await call<unknown>(`/admin/sales/counts?${withFilters({ q, companyId })}`));
  } catch (e) {
    if (e instanceof ApiError && e.status === 400) return toCounts(null);
    throw e;
  }
}

export async function liveCompanyNames(): Promise<{ id: string; name: string }[]> {
  const res = await call<unknown>("/admin/companies/names");
  const list = Array.isArray(res) ? res : arr(obj(res).content);
  return list.map(obj).filter((c) => str(c.id)).map((c) => ({ id: str(c.id), name: str(c.name, "—") }));
}
