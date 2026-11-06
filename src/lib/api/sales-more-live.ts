import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { arr, liveBookings, liveTransactions, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import type { RentalInvoiceRow, RentalInvoiceStatus } from "@/lib/repos/rental-invoices";
import { RENTAL_PURPOSES, type RentalRow } from "@/lib/repos/rentals";
import type { ExpiringBooking, OnlineStats, PaymentMethodRow, TicketRow } from "@/lib/repos/sales";
import type {
  BookingChannel, BookingPaymentStatus, PaymentMethodKind, RentalPurpose, RentalStatus, TicketStatus,
} from "@/lib/types";

type Names = Map<string, string>;
const nameOf = (names: Names, id: string) => names.get(id) ?? "—";
const TICKET = ["ISSUED", "CHECKED_IN", "USED", "CANCELLED"] as const;
const RENTAL = ["REQUESTED", "QUOTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const;
const PURPOSES = ["WEDDING", "SCHOOL", "SPORT", "BUSINESS", "PILGRIMAGE", "OTHER"] as const;
const INVOICE = ["TO_PAY", "PARTIAL", "PAID", "OVERDUE", "CANCELLED"] as const;
const KINDS = ["MOBILE_MONEY", "CARD", "CASH"] as const;
const PAYMENT = ["settled", "deposit", "none", "partial", "pending"];

/** Passenger, route, amount and channel are not on the ticket: they come from its booking. */
export function toTicketRow(raw: unknown, names: Names, bookings: Map<string, { passengerName: string; routeLabel: string; departure: string; amount: number; currency: string; channel: BookingChannel; paymentStatus: BookingPaymentStatus }>): TicketRow {
  const t = obj(raw);
  const b = bookings.get(str(t.bookingId));
  return {
    id: str(t.id), ticketCode: str(t.ticketCode, "—"), bookingId: str(t.bookingId), bookingCode: str(t.bookingCode, "—"), companyId: str(t.companyId),
    companyName: nameOf(names, str(t.companyId)), passengerName: b?.passengerName ?? "—", routeLabel: b?.routeLabel ?? "—", departure: b?.departure ?? "",
    seatNumber: strOrNull(t.seatNumber), status: pick<TicketStatus>(t.status, TICKET, true, "ISSUED"), issuedAt: str(t.issuedAt), scanCount: num(t.scanCount),
    amount: b?.amount ?? 0, currency: b?.currency ?? "XOF", channel: b?.channel ?? "counter", paymentStatus: b?.paymentStatus ?? "pending", busPlate: "—",
  };
}

/** The customer phone arrives already masked; the driver is an employee id with no name on the platform. */
export function toRentalRow(raw: unknown, names: Names): RentalRow {
  const r = obj(raw);
  const payment = str(r.payment);
  return {
    id: str(r.id), rentalCode: str(r.rentalCode, "—"), companyId: str(r.companyId), companyName: nameOf(names, str(r.companyId)),
    customerName: str(r.customerName, "—"), customerPhone: str(r.customerPhone, "—"), purpose: pick<RentalPurpose>(r.purpose, PURPOSES, true, "OTHER"),
    passengers: num(r.passengers), pickup: str(r.pickup, "—"), destination: str(r.destination, "—"), departure: str(r.departure), returnAt: strOrNull(r.returnAt),
    estimatedKm: num(r.estimatedKm), busId: strOrNull(r.busId), busLabel: strOrNull(r.busLabel), driverId: strOrNull(r.driverId),
    driverName: strOrNull(r.driverId) ? "Affecté" : null, status: pick<RentalStatus>(r.status, RENTAL, true, "REQUESTED"), quoteAmount: numOrNull(r.quoteAmount),
    currency: str(r.currency, "XOF"), depositRequired: num(r.depositRequired), cautionAmount: num(r.cautionAmount), paidAmount: num(r.paidAmount), balance: num(r.balance),
    payment: (PAYMENT.includes(payment) ? payment : "none") as RentalRow["payment"],
    conflicts: Array.isArray(r.conflicts) ? r.conflicts.filter((c): c is string => typeof c === "string") : [], invoiceNumber: strOrNull(r.invoiceNumber),
    createdAt: str(r.createdAt), cancelledAt: strOrNull(r.cancelledAt), cancelReason: strOrNull(r.cancelReason),
  };
}

export function toRentalInvoiceRow(raw: unknown, names: Names): RentalInvoiceRow {
  const i = obj(raw);
  return {
    number: str(i.number, "—"), rentalId: str(i.rentalId), rentalCode: str(i.rentalCode, "—"), companyId: str(i.companyId), companyName: nameOf(names, str(i.companyId)),
    customerName: str(i.customerName, "—"), issuedAt: str(i.issuedAt), dueAt: str(i.dueAt), total: num(i.total), balance: num(i.balance), currency: str(i.currency, "XOF"),
    status: pick<RentalInvoiceStatus>(i.status, INVOICE, true, "TO_PAY"),
  };
}

export function toMethodRow(raw: unknown, names: Names, traffic: Map<string, { n: number; ok: number; ko: number }>): PaymentMethodRow {
  const m = obj(raw);
  const t = traffic.get(`${str(m.companyId)}|${str(m.name)}`) ?? { n: 0, ok: 0, ko: 0 };
  return {
    id: str(m.id), companyId: str(m.companyId), companyName: nameOf(names, str(m.companyId)), name: str(m.name, "—"),
    kind: pick<PaymentMethodKind>(m.methodType, KINDS, true, "MOBILE_MONEY"), provider: null, active: str(m.status).toUpperCase() === "ACTIVE",
    transactions: t.n, completed: t.ok, failed: t.ko, successRate: t.ok + t.ko ? Math.round((t.ok / (t.ok + t.ko)) * 100) : null,
  };
}

export function toExpiring(raw: unknown, names: Names): ExpiringBooking {
  const e = obj(raw);
  return {
    id: str(e.id), bookingCode: str(e.bookingCode, "—"), companyName: str(e.companyName) || nameOf(names, str(e.companyId)),
    passengerName: str(e.passengerName, "—"), amount: num(e.amount), currency: str(e.currency, "XOF"), minutesLeft: num(e.minutesLeft),
  };
}

// ---------------------------------------------------------------------------------------------------------

export async function liveTickets(f: { q?: string; companyId?: string; status?: string }): Promise<TicketRow[]> {
  const [rows, n, bookings] = await Promise.all([loadAll("/admin/tickets", withFilters(f)), companyNames(), liveBookings({ companyId: f.companyId })]);
  const byId = new Map(bookings.rows.map((b) => [b.id, b]));
  return rows.map((r) => toTicketRow(r, n, byId));
}

export async function liveTicketFigures() {
  const s = obj(await soft<unknown>("/admin/tickets/summary"));
  return { total: num(s.total), issued: num(s.issued), used: num(s.used), cancelled: num(s.cancelled) };
}

export async function liveRentals(f: { q?: string; companyId?: string; status?: string }): Promise<RentalRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/rentals", withFilters(f)), companyNames()]);
  return rows.map((r) => toRentalRow(r, n));
}

export async function liveRentalFigures() {
  const s = obj(await soft<unknown>("/admin/rentals/summary"));
  return { total: num(s.total), requestedOrQuoted: num(s.requestedOrQuoted), confirmed: num(s.confirmed), collected: num(s.collected), currency: str(s.currency, "XOF") };
}

export async function liveRentalInvoices(f: { q?: string; companyId?: string; status?: string }): Promise<RentalInvoiceRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/rental-invoices", withFilters(f)), companyNames()]);
  return rows.map((r) => toRentalInvoiceRow(r, n));
}

export async function liveInvoiceFigures() {
  const s = obj(await soft<unknown>("/admin/rental-invoices/summary"));
  return { total: num(s.total), toCollect: num(s.toCollect), paid: num(s.paid), overdue: num(s.overdue), currency: str(s.currency, "XOF") };
}

/** Traffic per method is counted from the transaction list (matched on company and method name). */
export async function liveMethods(f: { q?: string; companyId?: string }): Promise<PaymentMethodRow[]> {
  const [rows, n, tx] = await Promise.all([loadAll("/admin/payment-methods", withFilters(f)), companyNames(), liveTransactions({ companyId: f.companyId })]);
  const traffic = new Map<string, { n: number; ok: number; ko: number }>();
  for (const t of tx.rows) {
    const key = `${t.companyId}|${t.methodName}`;
    const cur = traffic.get(key) ?? { n: 0, ok: 0, ko: 0 };
    traffic.set(key, { n: cur.n + 1, ok: cur.ok + (t.status === "COMPLETED" ? 1 : 0), ko: cur.ko + (t.status === "FAILED" ? 1 : 0) });
  }
  return rows.map((r) => toMethodRow(r, n, traffic));
}

export async function liveOnlineStats(): Promise<{ stats: OnlineStats; ttl: number }> {
  const [raw, watch, failed, n] = await Promise.all([
    soft<unknown>("/admin/sales/online/stats"), soft<unknown>("/admin/online-bookings/watch"),
    liveBookings({ channel: "online", paymentStatus: "failed" }).then((r) => r.rows.length).catch(() => 0), companyNames(),
  ]);
  const s = obj(raw), w = obj(watch);
  const total = num(s.total), paid = num(s.paid);
  return {
    ttl: num(s.ttlMinutes, 30),
    stats: {
      total, paid, conversionPercent: total ? Math.round((paid / total) * 100) : null, failedPayments: failed, expired: num(s.expired),
      stuck: num(w.stuckPayments), expiring: arr(w.expiring).map((e) => toExpiring(e, n)),
    },
  };
}

/** Counters the sales counts endpoint does not carry. */
export async function liveRentalCounts(q?: string, companyId?: string) {
  const total = async (path: string) => {
    const raw = await soft<unknown>(`${path}?${withFilters({ q, companyId, size: "1" })}`);
    return raw && typeof raw === "object" ? numOrNull(obj(raw).totalElements) : null;
  };
  const [locations, factures] = await Promise.all([total("/admin/rentals"), total("/admin/rental-invoices")]);
  return { locations, factures };
}

// --- ticket detail ------------------------------------------------------------------------------------------

import { call } from "@/lib/api/sales-live";
import { ApiError } from "@/lib/api/http";
import { liveBookingDetail } from "@/lib/api/sales-detail-live";
import type { TicketDetail } from "@/lib/repos/sales";

/** Only the last scan is known from the ticket; the full scan log needs a controller id and is not shown. */
export async function liveTicketDetail(code: string): Promise<TicketDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/tickets/${encodeURIComponent(code)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const t = obj(raw);
  const [names, booking] = await Promise.all([companyNames(), liveBookingDetail(str(t.bookingId)).catch(() => null)]);
  const b = booking?.booking;
  const ticket = toTicketRow(t, names, new Map(b ? [[str(t.bookingId), {
    passengerName: booking.booking.passengerName ?? "—", routeLabel: booking.routeLabel, departure: booking.departure, amount: b.amount, currency: b.currency,
    channel: b.channel, paymentStatus: b.paymentStatus,
  }]] : []));
  const scannedAt = strOrNull(t.scannedAt);
  return {
    ticket: { ...ticket, busPlate: booking?.busPlate ?? "—" }, scans: [], tripId: b ? b.tripId : "",
    scanLog: scannedAt ? [{ at: scannedAt, byName: null, byId: strOrNull(t.scannedBy) }] : [],
  };
}

// --- rental detail ------------------------------------------------------------------------------------------

import { liveBuses } from "@/lib/api/fleet-live";
import { userNames } from "@/lib/api/comp-live";
import type { RentalDetail } from "@/lib/repos/rentals";

const ACTIONS = ["quote", "assign", "pay", "confirm", "complete", "cancel"] as const;

/** Assignable buses are the company's active buses; drivers are its crew registry (employee codes, no names on the platform). */
export async function liveRentalDetail(id: string): Promise<RentalDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/rentals/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const d = obj(raw);
  const names = await companyNames();
  const rental = toRentalRow(d.rental, names);
  const [buses, crewRaw, actors] = await Promise.all([
    liveBuses({ companyId: rental.companyId, status: "active" }).catch(() => []),
    loadAll("/admin/crew", withFilters({ companyId: rental.companyId, role: "DRIVER" })).catch(() => []),
    userNames(arr(d.history).map((h) => str(h.actorUserId))),
  ]);
  const drivers = crewRaw.map(obj).map((c) => ({ id: str(c.id), name: str(c.employeeCode, "Chauffeur") }));
  const driverName = drivers.find((c) => c.id === rental.driverId)?.name ?? rental.driverName;
  return {
    rental: { ...rental, driverName },
    payments: arr(d.payments).map((p) => ({ at: str(p.at), amount: num(p.amount) })),
    history: arr(d.history).map((h) => ({ at: str(h.at), label: str(h.label, "—"), actor: actors.get(str(h.actorUserId)) ?? "Système" })),
    buses: buses.map((b) => ({ id: b.id, label: `${b.plate} · ${b.brandModel}`, seats: b.seatCapacity })),
    drivers,
    nextActions: (Array.isArray(d.nextActions) ? d.nextActions : []).map((a) => String(a).toLowerCase()).filter((a): a is (typeof ACTIONS)[number] => (ACTIONS as readonly string[]).includes(a)),
  };
}

/** The invoice card only shows the number, the total, the balance and the status. */
export async function liveRentalInvoiceLite(number: string): Promise<RentalInvoiceRow | null> {
  try {
    const raw = obj(await call<unknown>(`/admin/rental-invoices/${encodeURIComponent(number)}`));
    return toRentalInvoiceRow(raw.invoice && typeof raw.invoice === "object" ? raw.invoice : raw, await companyNames());
  } catch (e) {
    if (e instanceof ApiError) return null;
    throw e;
  }
}

// --- rental invoice sheet -----------------------------------------------------------------------------------

import type { RentalInvoice } from "@/lib/repos/rental-invoices";
import type { InvoiceTemplate } from "@/lib/types";

export function toTemplate(raw: unknown): InvoiceTemplate {
  const t = obj(raw);
  return {
    logoDataUrl: strOrNull(t.logoDataUrl), primaryColor: str(t.primaryColor, "#1f2937"), accentColor: str(t.accentColor, "#f59e0b"),
    headerNote: str(t.headerNote), footerNote: str(t.footerNote), legalMentions: str(t.legalMentions), taxRate: num(t.taxRate),
    paymentTermsDays: num(t.paymentTermsDays, 7), showQr: t.showQr === true,
  };
}

/** The issuer shows its legal identity only (name, country, NINEA, registration): the company's e-mail and phone stay out. */
export async function liveRentalInvoice(number: string): Promise<RentalInvoice | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/rental-invoices/${encodeURIComponent(number)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const i = obj(raw);
  const companyId = str(i.companyId);
  const [company, template] = await Promise.all([
    soft<unknown>(`/companies/${encodeURIComponent(companyId)}`), soft<unknown>(`/admin/companies/${encodeURIComponent(companyId)}/invoice-template`),
  ]);
  const c = obj(company);
  return {
    number: str(i.number, number), rentalId: str(i.rentalId), rentalCode: str(i.rentalCode, "—"), companyId,
    issuer: { name: str(c.name, "—"), lines: [str(c.country)].filter(Boolean), ninea: str(c.ninea, "—"), registration: str(c.registrationNumber, "—") },
    customer: { name: str(i.customerName, "—"), lines: [str(i.customerPhone), RENTAL_PURPOSES[pick<RentalPurpose>(i.purpose, PURPOSES, true, "OTHER")]].filter(Boolean) },
    lines: arr(i.lines).map((l) => ({ label: str(l.label, "—"), detail: str(l.detail), amount: num(l.amount) })),
    subtotal: num(i.subtotal), taxRate: num(i.taxRate), taxAmount: num(i.taxAmount), total: num(i.total), paid: num(i.paid), balance: num(i.balance),
    cautionAmount: num(i.cautionAmount), currency: str(i.currency, "XOF"), issuedAt: str(i.issuedAt), dueAt: str(i.dueAt),
    status: pick<RentalInvoiceStatus>(i.status, INVOICE, true, "TO_PAY"), payLink: str(i.payLink), template: toTemplate(template),
  };
}
