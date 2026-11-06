import { loadAll, names as companyNames, soft, toFeedback, toTrackedParcel } from "@/lib/api/care-live";
import { userNames } from "@/lib/api/comp-live";
import { liveStations, liveTrips } from "@/lib/api/fleet-live";
import { ApiError } from "@/lib/api/http";
import { arr, call, num, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import type {
  CustomerBookingRow, CustomerDetail, FeedbackDetail, LoyaltyAccountDetail, SponsorshipRow,
} from "@/lib/repos/clients";
import type { ParcelDetail } from "@/lib/repos/parcels";
import { PARCEL_STATUSES } from "@/lib/repos/parcels";
import type {
  BookingPaymentStatus, BookingStatus, MembershipType, ParcelPaymentStatus, ParcelType, SponsorshipRewardType, SponsorshipStatus, TripStatus,
} from "@/lib/types";

const TIERS = ["REGULAR", "VIP", "PREMIUM"] as const;
const REWARDS = ["DISCOUNT", "LOYALTY_POINTS", "CASH"] as const;
const SPONSOR_STATUS = ["ACTIVE", "REDEEMED", "EXPIRED"] as const;
const PARCEL_TYPES = ["DOCUMENT", "PACKAGE", "FRAGILE", "PERISHABLE", "OTHER"] as const;

async function detailOf(path: string): Promise<unknown | null> {
  try {
    return await call<unknown>(path);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
}

export async function liveCustomerDetail(id: string): Promise<CustomerDetail | null> {
  const raw = await detailOf(`/admin/customers/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const d = obj(raw), c = obj(d.customer);
  const userId = str(c.userId);
  const [companies, accountsRaw, sponsorRaw, feedbackRaw, bookingsRaw, userRaw] = await Promise.all([
    companyNames(), soft<unknown>(`/admin/customers/${encodeURIComponent(id)}/loyalty-accounts`),
    soft<unknown>(`/admin/customers/${encodeURIComponent(id)}/sponsorships`), soft<unknown>(`/admin/customers/${encodeURIComponent(id)}/feedbacks`),
    soft<unknown>(`/admin/sales/users/${encodeURIComponent(userId)}/bookings`), soft<unknown>(`/admin/users/${encodeURIComponent(userId)}`),
  ]);
  const accounts = (Array.isArray(accountsRaw) ? accountsRaw : []).map(obj).map((a): LoyaltyAccountDetail => ({
    id: str(a.id), companyId: str(a.companyId), companyName: companies.get(str(a.companyId)) ?? "—", programName: strOrNull(a.programName),
    programStatus: null, points: num(a.loyaltyPoints), membershipType: pick<MembershipType>(a.tier, TIERS, true, "REGULAR"),
    movements: arr(a.movements).map((m) => ({ id: str(m.id), bookingId: "", bookingCode: "—", points: num(m.points), createdAt: str(m.at) })),
  }));
  const sponsorships = (Array.isArray(sponsorRaw) ? sponsorRaw : []).map(obj).filter((s) => str(s.role).toUpperCase() !== "SPONSORED").map((s): SponsorshipRow => ({
    id: str(s.id), companyName: companies.get(str(s.companyId)) ?? "—", code: str(s.sponsorCode, "—"),
    rewardType: pick<SponsorshipRewardType>(s.rewardType, REWARDS, true, "DISCOUNT"), rewardValue: num(s.rewardValue), currency: "XOF",
    status: pick<SponsorshipStatus>(s.status, SPONSOR_STATUS, true, "ACTIVE"), createdAt: str(s.createdAt), expiresAt: str(s.expiresAt),
  }));
  const bookingList = Array.isArray(bookingsRaw) ? bookingsRaw : arr(obj(bookingsRaw).content);
  const bookings = bookingList.map(obj).map((b): CustomerBookingRow => ({
    id: str(b.id), bookingCode: str(b.bookingCode, "—"), routeLabel: str(b.routeLabel, "—"), departure: str(b.departure), amount: num(b.amount),
    currency: str(b.currency, "XOF"), status: pick<BookingStatus>(b.status, ["confirmed", "cancelled"], false, "confirmed"),
    paymentStatus: pick<BookingPaymentStatus>(b.paymentStatus, ["pending", "paid", "failed"], false, "pending"), createdAt: str(b.createdAt),
  }));
  const sponsor = d.sponsoredBy && typeof d.sponsoredBy === "object" ? obj(d.sponsoredBy) : null;
  return {
    customer: { id: str(c.id), userId, name: str(c.name, "—"), isCorporate: c.corporate === true, sponsorshipId: null, sponsoredAt: strOrNull(d.sponsoredAt), createdAt: str(c.createdAt) },
    userId, userStatus: str(obj(userRaw).user && obj(obj(userRaw).user).status).toLowerCase() === "suspended" ? "suspended" : "active",
    parcelCount: null, totalPoints: num(c.totalPoints), accounts, sponsorships,
    sponsoredBy: sponsor ? { code: "—", sponsorName: str(sponsor.name, "—"), companyName: "—", at: str(d.sponsoredAt) } : null,
    bookings, feedbacks: (Array.isArray(feedbackRaw) ? feedbackRaw : []).map((f) => toFeedback(f, companies)),
  };
}

export async function liveFeedbackDetail(id: string): Promise<FeedbackDetail | null> {
  const raw = await detailOf(`/admin/feedbacks/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const d = obj(raw), f = obj(d.feedback);
  const companies = await companyNames();
  const row = toFeedback(f, companies);
  const tripId = strOrNull(d.tripId);
  const trips = tripId ? await liveTrips({ companyId: row.companyId }).catch(() => []) : [];
  return {
    feedback: {
      id: row.id, companyId: row.companyId, customerId: row.customerId, tripId, parcelId: strOrNull(d.parcelId), bookingId: strOrNull(d.bookingId),
      rating: row.rating, feedbackType: row.feedbackType, title: row.title, comment: str(d.comment), status: row.status,
      response: strOrNull(d.response), respondedAt: strOrNull(d.respondedAt), createdAt: row.createdAt,
    },
    companyName: row.companyName, customerName: row.customerName, tripLabel: tripId ? (trips.find((t) => t.id === tripId)?.routeLabel ?? null) : null,
    bookingCode: null, parcelCode: null,
    ignoreBlockedReason: row.status === "PENDING" || row.status === "REVIEWED" ? null : "Seuls les avis en attente ou examinés peuvent être ignorés",
  };
}

export async function liveParcelDetail(id: string): Promise<ParcelDetail | null> {
  const raw = await detailOf(`/admin/parcels/${encodeURIComponent(id)}`);
  if (!raw) return null;
  const d = obj(raw), p = obj(d.parcel);
  const companyId = str(p.companyId);
  const [companies, legsRaw, historyRaw, stations, trips] = await Promise.all([
    companyNames(), soft<unknown>(`/admin/parcels/${encodeURIComponent(id)}/legs`), soft<unknown>(`/admin/parcels/${encodeURIComponent(id)}/history`),
    liveStations({ companyId }).catch(() => []), liveTrips({ companyId }).catch(() => []),
  ]);
  const users = await userNames([str(p.senderId), ...arr(historyRaw).map((h) => str(h.changedBy))]);
  const stationName = (sid: string) => stations.find((s) => s.id === sid)?.name ?? "—";
  const tripOf = (tid: string) => trips.find((t) => t.id === tid);
  const base = toTrackedParcel({ ...p, companyName: companies.get(companyId) ?? "—", senderName: users.get(str(p.senderId)) ?? "—" });
  const trip = tripOf(str(p.tripId));
  const origin = stationName(str(p.originStationId)), destination = stationName(str(p.destinationStationId));
  return {
    parcel: {
      id: base.id, companyId, parcelCode: base.parcelCode, trackingNumber: base.trackingNumber, senderName: base.senderName, senderCustomerId: null,
      recipientName: base.recipientName, recipientPhone: str(d.recipientPhoneMasked, "••••"), weightKg: base.weightKg,
      parcelType: pick<ParcelType>(p.parcelType, PARCEL_TYPES, true, "OTHER"), description: str(d.description), tripId: str(p.tripId),
      originStationId: str(p.originStationId), destinationStationId: str(p.destinationStationId), pickupAt: base.createdAt, expectedDeliveryAt: base.expectedAt,
      actualDeliveryAt: base.deliveredAt, status: pick(p.status, PARCEL_STATUSES, true, "PENDING"), shippingFee: base.shippingFee, currency: base.currency,
      paymentStatus: pick<ParcelPaymentStatus>(p.paymentStatus, ["PENDING", "PAID", "REFUNDED"], true, "PENDING"), createdAt: base.createdAt,
    },
    companyName: base.companyName, originName: origin, destinationName: destination, routeLabel: trip?.routeLabel ?? `${origin} → ${destination}`,
    recipientPhoneMasked: str(d.recipientPhoneMasked, "••••"),
    legs: arr(legsRaw).map((l) => {
      const t = tripOf(str(l.tripId));
      return { id: str(l.id), sequence: num(l.sequence), assignmentCode: str(l.assignmentCode, "—"), tripId: str(l.tripId), routeLabel: t?.routeLabel ?? "—", departure: t?.departure ?? "", tripStatus: (t?.status ?? "planned") as TripStatus };
    }),
    history: arr(historyRaw).map((h) => ({
      id: str(h.id), previousStatus: h.previousStatus ? pick(h.previousStatus, PARCEL_STATUSES, true, "PENDING") : null, newStatus: pick(h.newStatus, PARCEL_STATUSES, true, "PENDING"),
      notes: strOrNull(h.notes), changedBy: users.get(str(h.changedBy)) ?? null, changedAt: str(h.changedAt),
    })),
    lostBlockedReason: strOrNull(d.lostBlockedReason),
  };
}
void loadAll; void withFilters;
