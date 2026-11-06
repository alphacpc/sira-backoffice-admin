import { notFound, redirect } from "next/navigation";
import { ApiError, apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";
import { anomalyExplanation, anomalyLabel } from "@/lib/labels";
import { arr, num, obj, pick, str, strOrNull, toTransactionRow } from "@/lib/api/sales-live";
import type { BookingDetail, TicketRow, TransactionDetail } from "@/lib/repos/sales";
import type {
  AnomalyKind, BookingChannel, BookingPaymentStatus, BookingStatus, CancelReason, TicketStatus, TripStatus,
} from "@/lib/types";

const ANOMALY_KINDS = ["STUCK", "AMOUNT_MISMATCH", "MISSING_TICKET"] as const;
const bookingStatus = (v: unknown) => pick<BookingStatus>(v, ["confirmed", "cancelled"], false, "confirmed");
const paymentStatus = (v: unknown) => pick<BookingPaymentStatus>(v, ["pending", "paid", "failed"], false, "pending");
const channel = (v: unknown) => pick<BookingChannel>(v, ["counter", "online"], false, "counter");

function toTicketRow(raw: unknown, parent: { bookingId: string; bookingCode: string; companyId: string; companyName: string;
  passengerName: string; routeLabel: string; departure: string; busPlate: string; amount: number; currency: string;
  channel: BookingChannel; paymentStatus: BookingPaymentStatus }): TicketRow {
  const t = obj(raw);
  return {
    id: str(t.id), ticketCode: str(t.ticketCode, "—"), bookingId: str(t.bookingId, parent.bookingId),
    bookingCode: str(t.bookingCode, parent.bookingCode), companyId: str(t.companyId, parent.companyId),
    companyName: str(t.companyName, parent.companyName), passengerName: str(t.passengerName, parent.passengerName),
    routeLabel: str(t.routeLabel, parent.routeLabel), departure: str(t.departure, parent.departure),
    seatNumber: strOrNull(t.seatNumber),
    status: pick<TicketStatus>(t.status, ["ISSUED", "CHECKED_IN", "USED", "CANCELLED"], true, "ISSUED"),
    issuedAt: str(t.issuedAt ?? t.createdAt), scanCount: num(t.scanCount),
    amount: num(t.amount, parent.amount), currency: str(t.currency, parent.currency),
    channel: t.channel === undefined ? parent.channel : channel(t.channel),
    paymentStatus: t.paymentStatus === undefined ? parent.paymentStatus : paymentStatus(t.paymentStatus),
    busPlate: str(t.busPlate, parent.busPlate),
  };
}

export function toBookingDetail(raw: unknown): BookingDetail {
  const d = obj(raw);
  const b = obj(d.booking);
  const reason = typeof b.cancelReason === "string" ? b.cancelReason.toUpperCase() : "";
  const booking = {
    id: str(b.id), companyId: str(b.companyId), tripId: str(b.tripId),
    userId: null, // contact/account data is never shown
    passengerName: str(b.passengerName, "—"), bookingCode: str(b.bookingCode, "—"), seatNumber: strOrNull(b.seatNumber),
    status: bookingStatus(b.status), paymentStatus: paymentStatus(b.paymentStatus), channel: channel(b.channel),
    amount: num(b.amount), currency: str(b.currency, "XOF"), ticketIssued: b.ticketIssued === true,
    createdAt: str(b.createdAt), cancelledAt: strOrNull(b.cancelledAt),
    cancelReason: (["EXPIRED", "CLIENT", "PLATFORM"] as const).includes(reason as CancelReason) ? (reason as CancelReason) : null,
  };
  const companyName = str(d.companyName, "—");
  const routeLabel = str(d.routeLabel, "—");
  const departure = str(d.departure);
  const busPlate = str(d.busPlate, "—");
  const parent = {
    bookingId: booking.id, bookingCode: booking.bookingCode, companyId: booking.companyId, companyName,
    passengerName: booking.passengerName, routeLabel, departure, busPlate, amount: booking.amount,
    currency: booking.currency, channel: booking.channel, paymentStatus: booking.paymentStatus,
  };
  return {
    booking, companyName, routeLabel, departure,
    tripStatus: pick<TripStatus>(d.tripStatus, ["planned", "boarding", "departed", "cancelled"], false, "planned"),
    busPlate,
    transactions: arr(d.transactions).map((t) => toTransactionRow({
      bookingId: booking.id, bookingCode: booking.bookingCode, companyId: booking.companyId, companyName,
      passengerName: booking.passengerName, ...t,
    })),
    tickets: arr(d.tickets).map((t) => toTicketRow(t, parent)),
    timeline: arr(d.timeline).map((e) => ({ at: str(e.at), label: str(e.label, "—") })),
    cancelBlockedReason: strOrNull(d.cancelBlockedReason),
  };
}

export function toTransactionDetail(raw: unknown): TransactionDetail {
  const d = obj(raw);
  const b = obj(d.booking);
  const transaction = toTransactionRow({ ...obj(d.transaction), bookingCode: obj(d.transaction).bookingCode ?? b.bookingCode,
    bookingId: obj(d.transaction).bookingId ?? b.id, passengerName: obj(d.transaction).passengerName ?? b.passengerName });
  return {
    transaction,
    booking: {
      id: str(b.id, transaction.bookingId), bookingCode: str(b.bookingCode, transaction.bookingCode),
      passengerName: str(b.passengerName, "—"), seatNumber: strOrNull(b.seatNumber), amount: num(b.amount),
      currency: str(b.currency, "XOF"), status: bookingStatus(b.status), paymentStatus: paymentStatus(b.paymentStatus),
    },
    anomalies: arr(d.anomalies).flatMap((a) => {
      const kind = typeof a.kind === "string" ? a.kind.toUpperCase() : "";
      if (!(ANOMALY_KINDS as readonly string[]).includes(kind)) return [];
      const k = kind as AnomalyKind;
      return [{ kind: k, label: str(a.label) || anomalyLabel(k), explanation: str(a.explanation) || anomalyExplanation(k) }];
    }),
  };
}

async function read(path: string): Promise<unknown> {
  try {
    return await apiCall<unknown>(path, { token: await currentBackendToken() });
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 404) notFound();
      if (e.status === 401 || e.status === 403) redirect("/session-expiree");
    }
    throw e;
  }
}

export async function liveBookingDetail(id: string): Promise<BookingDetail> {
  return toBookingDetail(await read(`/admin/sales/bookings/${encodeURIComponent(id)}`));
}

export async function liveTransactionDetail(id: string): Promise<TransactionDetail> {
  return toTransactionDetail(await read(`/admin/sales/transactions/${encodeURIComponent(id)}`));
}
