import { addActivity } from "@/lib/repos/activity";
import { anomalyExplanation, anomalyLabel } from "@/lib/labels";
import { routeLabel } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type {
  AnomalyKind, Booking, BookingChannel, BookingPaymentStatus, BookingStatus, CancelReason, PaymentMethodKind,
  Ticket, TicketStatus, Transaction, TransactionStatus, TripStatus,
} from "@/lib/types";

export type { AnomalyKind } from "@/lib/types";

const MINUTE = 60_000;

/** A pending payment is stuck once it has waited strictly longer than this. */
export const STUCK_AFTER_MINUTES = 30;
/** An unpaid online booking expires this long after its creation. */
export const ONLINE_UNPAID_TTL_MINUTES = 30;

export const BOOKING_STATUSES = ["confirmed", "cancelled"] as const;
export const BOOKING_PAYMENT_STATUSES = ["pending", "paid", "failed"] as const;
export const BOOKING_CHANNELS = ["counter", "online"] as const;
export const TRANSACTION_STATUSES = ["PENDING", "COMPLETED", "FAILED"] as const;
export const TICKET_STATUSES = ["ISSUED", "CHECKED_IN", "USED", "CANCELLED"] as const;

/** Client-safe projection of a booking. */
export interface BookingRow {
  id: string; bookingCode: string; companyId: string; companyName: string; passengerName: string;
  routeLabel: string; departure: string; seatNumber: string | null; amount: number; currency: string;
  channel: BookingChannel; status: BookingStatus; paymentStatus: BookingPaymentStatus; createdAt: string;
}

/** Client-safe projection of a transaction, with its computed anomalies. */
export interface TransactionRow {
  id: string; reference: string; bookingId: string; bookingCode: string; companyId: string; companyName: string;
  passengerName: string; methodName: string; amount: number; currency: string; status: TransactionStatus;
  failureReason: string | null; createdAt: string; completedAt: string | null; anomalies: AnomalyKind[];
}

/** Client-safe projection of a ticket. */
export interface TicketRow {
  id: string; ticketCode: string; bookingId: string; bookingCode: string; companyId: string; companyName: string;
  passengerName: string; routeLabel: string; departure: string; seatNumber: string | null;
  status: TicketStatus; issuedAt: string; scanCount: number;
}

/** Client-safe projection of a payment method with its traffic. */
export interface PaymentMethodRow {
  id: string; companyId: string; companyName: string; name: string; kind: PaymentMethodKind;
  provider: string | null; active: boolean; transactions: number; completed: number; failed: number;
  /** Percentage of finished payments (completed or failed) that succeeded; `null` without any. */
  successRate: number | null;
}

export interface TimelineEvent { at: string; label: string }

export interface BookingDetail {
  booking: Booking;
  companyName: string;
  routeLabel: string;
  departure: string;
  tripStatus: TripStatus;
  busPlate: string;
  transactions: TransactionRow[];
  tickets: TicketRow[];
  timeline: TimelineEvent[];
  cancelBlockedReason: string | null;
}

export interface TransactionDetail {
  transaction: TransactionRow;
  booking: Pick<Booking, "id" | "bookingCode" | "passengerName" | "seatNumber" | "amount" | "currency" | "status" | "paymentStatus">;
  anomalies: { kind: AnomalyKind; label: string; explanation: string }[];
}

export interface TicketDetail { ticket: TicketRow; scans: string[] }

export interface ExpiringBooking {
  id: string; bookingCode: string; companyName: string; passengerName: string;
  amount: number; currency: string; minutesLeft: number;
}

export interface OnlineStats {
  total: number; paid: number; conversionPercent: number | null; failedPayments: number;
  expired: number; stuck: number; expiring: ExpiringBooking[];
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

const newest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

function tripInfo(tripId: string): { routeLabel: string; departure: string; status: TripStatus; busPlate: string } {
  const s = getStore();
  const trip = s.trips.find((t) => t.id === tripId);
  if (!trip) return { routeLabel: "—", departure: "", status: "planned", busPlate: "—" };
  return {
    routeLabel: routeLabel(trip.routeId), departure: trip.departure, status: trip.status,
    busPlate: s.buses.find((b) => b.id === trip.busId)?.plate ?? "—",
  };
}

/** Why a booking cannot be cancelled by the platform, `null` when it can. Same order as the cancel guards. */
export function cancelBlockReason(booking: Booking): string | null {
  if (booking.status === "cancelled") return "Cette réservation est déjà annulée";
  if (booking.paymentStatus === "paid") return "Une réservation payée ne peut pas être annulée";
  if (getStore().transactions.some((t) => t.bookingId === booking.id && t.status === "PENDING")) {
    return "Un paiement est en cours sur cette réservation";
  }
  return null;
}

/** Anomalies of a transaction, computed against the injected clock (never stored). */
export function transactionAnomalies(tx: Transaction, now: Date): AnomalyKind[] {
  const s = getStore();
  const found: AnomalyKind[] = [];
  if (tx.status === "PENDING" && now.getTime() - Date.parse(tx.createdAt) > STUCK_AFTER_MINUTES * MINUTE) {
    found.push("STUCK");
  }
  const booking = s.bookings.find((b) => b.id === tx.bookingId);
  if (booking && booking.amount !== tx.amount) found.push("AMOUNT_MISMATCH");
  if (tx.status === "COMPLETED" && !s.tickets.some((t) => t.bookingId === tx.bookingId)) found.push("MISSING_TICKET");
  return found;
}

function bookingRow(b: Booking): BookingRow {
  const trip = tripInfo(b.tripId);
  return {
    id: b.id, bookingCode: b.bookingCode, companyId: b.companyId, companyName: companyName(b.companyId),
    passengerName: b.passengerName, routeLabel: trip.routeLabel, departure: trip.departure,
    seatNumber: b.seatNumber, amount: b.amount, currency: b.currency, channel: b.channel,
    status: b.status, paymentStatus: b.paymentStatus, createdAt: b.createdAt,
  };
}

function transactionRow(t: Transaction, now: Date): TransactionRow {
  const s = getStore();
  const booking = s.bookings.find((b) => b.id === t.bookingId);
  return {
    id: t.id, reference: t.reference, bookingId: t.bookingId, bookingCode: booking?.bookingCode ?? "—",
    companyId: t.companyId, companyName: companyName(t.companyId), passengerName: booking?.passengerName ?? "—",
    methodName: s.paymentMethods.find((m) => m.id === t.paymentMethodId)?.name ?? "—",
    amount: t.amount, currency: t.currency, status: t.status, failureReason: t.failureReason,
    createdAt: t.createdAt, completedAt: t.completedAt, anomalies: transactionAnomalies(t, now),
  };
}

function ticketRow(t: Ticket): TicketRow {
  const booking = getStore().bookings.find((b) => b.id === t.bookingId);
  const trip = tripInfo(t.tripId);
  return {
    id: t.id, ticketCode: t.ticketCode, bookingId: t.bookingId, bookingCode: booking?.bookingCode ?? "—",
    companyId: t.companyId, companyName: companyName(t.companyId), passengerName: booking?.passengerName ?? "—",
    routeLabel: trip.routeLabel, departure: trip.departure, seatNumber: t.seatNumber,
    status: t.status, issuedAt: t.issuedAt, scanCount: t.scans.length,
  };
}

function timelineOf(b: Booking, txs: Transaction[], tickets: Ticket[]): TimelineEvent[] {
  const s = getStore();
  const events: TimelineEvent[] = [{
    at: b.createdAt, label: b.channel === "online" ? "Réservation créée en ligne" : "Réservation créée au guichet",
  }];
  for (const t of txs) {
    const method = s.paymentMethods.find((m) => m.id === t.paymentMethodId)?.name ?? "—";
    events.push({ at: t.createdAt, label: `Paiement lancé (${method})` });
    if (t.completedAt) {
      events.push({
        at: t.completedAt,
        label: t.status === "COMPLETED" ? "Paiement réussi" : `Paiement échoué : ${t.failureReason ?? "motif inconnu"}`,
      });
    }
  }
  for (const k of tickets) {
    events.push({ at: k.issuedAt, label: `Billet ${k.ticketCode} émis` });
    for (const scan of k.scans) events.push({ at: scan, label: `Billet ${k.ticketCode} scanné` });
  }
  if (b.cancelledAt && b.cancelReason) {
    const cause = {
      EXPIRED: "Expirée (non payée à temps)", CLIENT: "Annulée par le client", PLATFORM: "Annulée par l'équipe Sira",
    }[b.cancelReason];
    events.push({ at: b.cancelledAt, label: `Réservation annulée : ${cause}` });
  }
  return events.sort((a, c) => a.at.localeCompare(c.at));
}

export const bookingsRepo = {
  listRows(filter: {
    companyId?: string; status?: BookingStatus; paymentStatus?: BookingPaymentStatus; channel?: BookingChannel;
  } = {}): BookingRow[] {
    return getStore().bookings
      .filter((b) =>
        (!filter.companyId || b.companyId === filter.companyId) &&
        (!filter.status || b.status === filter.status) &&
        (!filter.paymentStatus || b.paymentStatus === filter.paymentStatus) &&
        (!filter.channel || b.channel === filter.channel))
      .sort(newest((b) => b.createdAt))
      .map(bookingRow);
  },

  get(id: string): Booking | undefined {
    return getStore().bookings.find((b) => b.id === id);
  },

  detail(id: string, now: Date = new Date()): BookingDetail | undefined {
    const s = getStore();
    const booking = s.bookings.find((b) => b.id === id);
    if (!booking) return undefined;
    const trip = tripInfo(booking.tripId);
    const txs = s.transactions.filter((t) => t.bookingId === id).sort(newest((t) => t.createdAt));
    const tickets = s.tickets.filter((t) => t.bookingId === id);
    return {
      booking, companyName: companyName(booking.companyId),
      routeLabel: trip.routeLabel, departure: trip.departure, tripStatus: trip.status, busPlate: trip.busPlate,
      transactions: txs.map((t) => transactionRow(t, now)),
      tickets: tickets.map(ticketRow),
      timeline: timelineOf(booking, txs, tickets),
      cancelBlockedReason: cancelBlockReason(booking),
    };
  },
};

export const transactionsRepo = {
  listRows(
    filter: { companyId?: string; status?: TransactionStatus; anomalyOnly?: boolean } = {}, now: Date = new Date(),
  ): TransactionRow[] {
    return getStore().transactions
      .filter((t) => (!filter.companyId || t.companyId === filter.companyId) && (!filter.status || t.status === filter.status))
      .sort(newest((t) => t.createdAt))
      .map((t) => transactionRow(t, now))
      .filter((r) => !filter.anomalyOnly || r.anomalies.length > 0);
  },

  detail(id: string, now: Date = new Date()): TransactionDetail | undefined {
    const s = getStore();
    const tx = s.transactions.find((t) => t.id === id);
    if (!tx) return undefined;
    const row = transactionRow(tx, now);
    const b = s.bookings.find((x) => x.id === tx.bookingId);
    if (!b) return undefined;
    return {
      transaction: row,
      booking: {
        id: b.id, bookingCode: b.bookingCode, passengerName: b.passengerName, seatNumber: b.seatNumber,
        amount: b.amount, currency: b.currency, status: b.status, paymentStatus: b.paymentStatus,
      },
      anomalies: row.anomalies.map((kind) => ({ kind, label: anomalyLabel(kind), explanation: anomalyExplanation(kind) })),
    };
  },
};

export const ticketsRepo = {
  listRows(filter: { companyId?: string; status?: TicketStatus } = {}): TicketRow[] {
    return getStore().tickets
      .filter((t) => (!filter.companyId || t.companyId === filter.companyId) && (!filter.status || t.status === filter.status))
      .sort(newest((t) => t.issuedAt))
      .map(ticketRow);
  },

  detailByCode(code: string): TicketDetail | undefined {
    const ticket = getStore().tickets.find((t) => t.ticketCode === code);
    return ticket ? { ticket: ticketRow(ticket), scans: [...ticket.scans] } : undefined;
  },
};

export const paymentMethodsRepo = {
  listRows(filter: { companyId?: string } = {}): PaymentMethodRow[] {
    const s = getStore();
    return s.paymentMethods
      .filter((m) => !filter.companyId || m.companyId === filter.companyId)
      .map((m) => {
        const txs = s.transactions.filter((t) => t.paymentMethodId === m.id);
        const completed = txs.filter((t) => t.status === "COMPLETED").length;
        const failed = txs.filter((t) => t.status === "FAILED").length;
        return {
          id: m.id, companyId: m.companyId, companyName: companyName(m.companyId), name: m.name, kind: m.kind,
          provider: m.provider, active: m.active, transactions: txs.length, completed, failed,
          successRate: completed + failed === 0 ? null : Math.round((completed / (completed + failed)) * 100),
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName) || a.name.localeCompare(b.name));
  },
};

export const onlineRepo = {
  stats(now: Date = new Date()): OnlineStats {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online");
    const onlineIds = new Set(online.map((b) => b.id));
    const paid = online.filter((b) => b.paymentStatus === "paid").length;
    const expiring = online
      .filter((b) =>
        b.status === "confirmed" && b.paymentStatus !== "paid" &&
        !s.transactions.some((t) => t.bookingId === b.id && t.status === "PENDING"))
      .map((b): ExpiringBooking => ({
        id: b.id, bookingCode: b.bookingCode, companyName: companyName(b.companyId), passengerName: b.passengerName,
        amount: b.amount, currency: b.currency,
        minutesLeft: Math.ceil((Date.parse(b.createdAt) + ONLINE_UNPAID_TTL_MINUTES * MINUTE - now.getTime()) / MINUTE),
      }))
      .sort((a, b) => a.minutesLeft - b.minutesLeft || a.id.localeCompare(b.id));
    return {
      total: online.length, paid,
      conversionPercent: online.length === 0 ? null : Math.round((paid / online.length) * 100),
      failedPayments: s.transactions.filter((t) => t.status === "FAILED" && onlineIds.has(t.bookingId)).length,
      expired: online.filter((b) => b.cancelReason === "EXPIRED").length,
      stuck: s.transactions.filter((t) => onlineIds.has(t.bookingId) && transactionAnomalies(t, now).includes("STUCK")).length,
      expiring,
    };
  },
};
