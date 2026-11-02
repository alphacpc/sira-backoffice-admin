import { addActivity } from "@/lib/repos/activity";
import { routeLabel } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type {
  BookingPaymentStatus, BookingStatus, Customer, Feedback, FeedbackStatus, FeedbackType, LoyaltyProgramStatus,
  MembershipType, SponsorshipRewardType, SponsorshipStatus, UserStatus,
} from "@/lib/types";

export const FEEDBACK_STATUSES = ["PENDING", "REVIEWED", "RESOLVED", "IGNORED"] as const;

/** Client-safe projection of a customer (no contact data). */
export interface CustomerRow {
  id: string; name: string; isCorporate: boolean; accountCount: number; totalPoints: number;
  onlineBookings: number; parcelCount: number; feedbackCount: number; sponsored: boolean;
  userStatus: UserStatus; createdAt: string;
}

export interface LoyaltyMovementRow { id: string; bookingId: string; bookingCode: string; points: number; createdAt: string }

export interface LoyaltyAccountDetail {
  id: string; companyId: string; companyName: string; programName: string | null;
  programStatus: LoyaltyProgramStatus | null; points: number; membershipType: MembershipType;
  movements: LoyaltyMovementRow[];
}

export interface SponsorshipRow {
  id: string; companyName: string; code: string; rewardType: SponsorshipRewardType; rewardValue: number;
  currency: string; status: SponsorshipStatus; createdAt: string; expiresAt: string;
}

export interface CustomerBookingRow {
  id: string; bookingCode: string; routeLabel: string; departure: string; amount: number; currency: string;
  status: BookingStatus; paymentStatus: BookingPaymentStatus; createdAt: string;
}

export interface FeedbackRow {
  id: string; companyId: string; companyName: string; customerId: string; customerName: string;
  feedbackType: FeedbackType; rating: number; title: string; status: FeedbackStatus;
  responded: boolean; createdAt: string;
}

export interface CustomerDetail {
  customer: Customer;
  userId: string;
  userStatus: UserStatus;
  parcelCount: number;
  totalPoints: number;
  accounts: LoyaltyAccountDetail[];
  sponsorships: SponsorshipRow[];
  sponsoredBy: { code: string; sponsorName: string; companyName: string; at: string } | null;
  bookings: CustomerBookingRow[];
  feedbacks: FeedbackRow[];
}

export interface LoyaltyProgramRow {
  id: string; companyId: string; companyName: string; name: string; pointsPerCurrencyUnit: number;
  redemptionRate: number; minPointsForRedemption: number; status: LoyaltyProgramStatus;
  accounts: number; pointsIssued: number;
}

export interface FeedbackDetail {
  feedback: Feedback;
  companyName: string;
  customerName: string;
  tripLabel: string | null;
  bookingCode: string | null;
  parcelCode: string | null;
  ignoreBlockedReason: string | null;
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function customerName(customerId: string): string {
  return getStore().customers.find((c) => c.id === customerId)?.name ?? "—";
}

const byNewest = <T extends { id: string }>(at: (x: T) => string) => (a: T, b: T) =>
  at(b).localeCompare(at(a)) || a.id.localeCompare(b.id);

/** Why a review cannot be ignored, `null` when it can: only pending and reviewed reviews can. */
export function feedbackIgnoreBlockReason(feedback: Feedback): string | null {
  return feedback.status === "PENDING" || feedback.status === "REVIEWED" ? null : "Cet avis est déjà traité";
}

function feedbackRow(f: Feedback): FeedbackRow {
  return {
    id: f.id, companyId: f.companyId, companyName: companyName(f.companyId), customerId: f.customerId,
    customerName: customerName(f.customerId), feedbackType: f.feedbackType, rating: f.rating, title: f.title,
    status: f.status, responded: f.response !== null, createdAt: f.createdAt,
  };
}

export const customersRepo = {
  listRows(): CustomerRow[] {
    const s = getStore();
    return s.customers
      .map((c): CustomerRow => {
        const accounts = s.loyaltyAccounts.filter((a) => a.customerId === c.id);
        return {
          id: c.id, name: c.name, isCorporate: c.isCorporate, accountCount: accounts.length,
          totalPoints: accounts.reduce((n, a) => n + a.points, 0),
          onlineBookings: s.bookings.filter((b) => b.userId === c.userId).length,
          parcelCount: s.parcels.filter((p) => p.senderCustomerId === c.id).length,
          feedbackCount: s.feedbacks.filter((f) => f.customerId === c.id).length,
          sponsored: c.sponsorshipId !== null,
          userStatus: s.users.find((u) => u.id === c.userId)?.status ?? "active",
          createdAt: c.createdAt,
        };
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  detail(id: string): CustomerDetail | undefined {
    const s = getStore();
    const customer = s.customers.find((c) => c.id === id);
    if (!customer) return undefined;
    const accounts = s.loyaltyAccounts
      .filter((a) => a.customerId === id)
      .map((a): LoyaltyAccountDetail => {
        const program = s.loyaltyPrograms.find((p) => p.companyId === a.companyId);
        return {
          id: a.id, companyId: a.companyId, companyName: companyName(a.companyId),
          programName: program?.name ?? null, programStatus: program?.status ?? null,
          points: a.points, membershipType: a.membershipType,
          movements: s.loyaltyTransactions
            .filter((t) => t.accountId === a.id)
            .sort(byNewest((t) => t.createdAt))
            .map((t) => ({
              id: t.id, bookingId: t.bookingId,
              bookingCode: s.bookings.find((b) => b.id === t.bookingId)?.bookingCode ?? "—",
              points: t.points, createdAt: t.createdAt,
            })),
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
    const sponsorships = s.sponsorships
      .filter((x) => x.sponsorCustomerId === id)
      .sort(byNewest((x) => x.createdAt))
      .map((x): SponsorshipRow => ({
        id: x.id, companyName: companyName(x.companyId), code: x.code, rewardType: x.rewardType,
        rewardValue: x.rewardValue, currency: s.companies.find((c) => c.id === x.companyId)?.currency ?? "XOF",
        status: x.status, createdAt: x.createdAt, expiresAt: x.expiresAt,
      }));
    const used = customer.sponsorshipId ? s.sponsorships.find((x) => x.id === customer.sponsorshipId) : undefined;
    return {
      customer, userId: customer.userId,
      userStatus: s.users.find((u) => u.id === customer.userId)?.status ?? "active",
      parcelCount: s.parcels.filter((p) => p.senderCustomerId === id).length,
      totalPoints: accounts.reduce((n, a) => n + a.points, 0),
      accounts, sponsorships,
      sponsoredBy: used
        ? {
          code: used.code, sponsorName: customerName(used.sponsorCustomerId), companyName: companyName(used.companyId),
          at: customer.sponsoredAt ?? used.createdAt,
        }
        : null,
      bookings: s.bookings
        .filter((b) => b.userId === customer.userId)
        .sort(byNewest((b) => b.createdAt))
        .slice(0, 10)
        .map((b): CustomerBookingRow => {
          const trip = s.trips.find((t) => t.id === b.tripId);
          return {
            id: b.id, bookingCode: b.bookingCode, routeLabel: trip ? routeLabel(trip.routeId) : "—",
            departure: trip?.departure ?? "", amount: b.amount, currency: b.currency, status: b.status,
            paymentStatus: b.paymentStatus, createdAt: b.createdAt,
          };
        }),
      feedbacks: s.feedbacks.filter((f) => f.customerId === id).sort(byNewest((f) => f.createdAt)).map(feedbackRow),
    };
  },
};

export const loyaltyRepo = {
  listPrograms(filter: { companyId?: string } = {}): LoyaltyProgramRow[] {
    const s = getStore();
    return s.loyaltyPrograms
      .filter((p) => !filter.companyId || p.companyId === filter.companyId)
      .map((p): LoyaltyProgramRow => {
        const accounts = s.loyaltyAccounts.filter((a) => a.companyId === p.companyId);
        return {
          id: p.id, companyId: p.companyId, companyName: companyName(p.companyId), name: p.name,
          pointsPerCurrencyUnit: p.pointsPerCurrencyUnit, redemptionRate: p.redemptionRate,
          minPointsForRedemption: p.minPointsForRedemption, status: p.status,
          accounts: accounts.length, pointsIssued: accounts.reduce((n, a) => n + a.points, 0),
        };
      })
      .sort((a, b) => a.companyName.localeCompare(b.companyName));
  },
};

export const feedbackRepo = {
  listRows(filter: { companyId?: string; status?: FeedbackStatus } = {}): FeedbackRow[] {
    return getStore().feedbacks
      .filter((f) => (!filter.companyId || f.companyId === filter.companyId) && (!filter.status || f.status === filter.status))
      .sort(byNewest((f) => f.createdAt))
      .map(feedbackRow);
  },

  get(id: string): Feedback | undefined {
    return getStore().feedbacks.find((f) => f.id === id);
  },

  detail(id: string): FeedbackDetail | undefined {
    const s = getStore();
    const feedback = s.feedbacks.find((f) => f.id === id);
    if (!feedback) return undefined;
    const trip = feedback.tripId ? s.trips.find((t) => t.id === feedback.tripId) : undefined;
    return {
      feedback, companyName: companyName(feedback.companyId), customerName: customerName(feedback.customerId),
      tripLabel: trip ? routeLabel(trip.routeId) : null,
      bookingCode: feedback.bookingId ? s.bookings.find((b) => b.id === feedback.bookingId)?.bookingCode ?? null : null,
      parcelCode: feedback.parcelId ? s.parcels.find((p) => p.id === feedback.parcelId)?.parcelCode ?? null : null,
      ignoreBlockedReason: feedbackIgnoreBlockReason(feedback),
    };
  },

  /** Ignores a review. Guards, in this order: review exists, reason, status pending or reviewed. */
  ignore(feedbackId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Feedback {
    const feedback = getStore().feedbacks.find((f) => f.id === feedbackId);
    if (!feedback) throw new Error("Avis introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    const blocked = feedbackIgnoreBlockReason(feedback);
    if (blocked) throw new Error(blocked);
    feedback.status = "IGNORED";
    addActivity(feedback.companyId, actor, `Avis « ${feedback.title} » ignoré. Motif : ${motif}`, now);
    return feedback;
  },
};
