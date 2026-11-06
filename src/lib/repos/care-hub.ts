import {
  customersRepo, feedbackRepo, loyaltyRepo, type CustomerRow, type FeedbackRow, type LoyaltyProgramRow,
} from "@/lib/repos/clients";
import { parcelsRepo, type ParcelRow } from "@/lib/repos/parcels";
import { getStore } from "@/lib/repos/store";
import type { FeedbackStatus, MembershipType, ParcelStatus, ParcelType, UserStatus } from "@/lib/types";

export const CARE_TABS = ["apercu", "colis", "comptes", "fidelite", "avis"] as const;
export type CareTab = (typeof CARE_TABS)[number];
export const TIERS = ["REGULAR", "VIP", "PREMIUM"] as const satisfies readonly MembershipType[];
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

/** Parcel with the expected delivery date, so that lateness can be shown. */
export type TrackedParcel = ParcelRow & { expectedAt: string; deliveredAt: string | null; late: boolean };
export type TieredCustomer = CustomerRow & { tier: MembershipType | null };

export interface CareOverview {
  parcels: { total: number; byStatus: Record<ParcelStatus, number> | null; deliveryRate: number | null; avgHours: number | null; revenue: number | null; late: TrackedParcel[]; lateCount: number; byType: { type: ParcelType; value: number }[] };
  customers: { total: number; fresh: number | null; corporate: number; avgPoints: number | null; tiers: { tier: MembershipType; value: number }[]; top: TieredCustomer[] | null };
  reviews: { average: number | null; total: number; distribution: number[]; pending: number; recent: FeedbackRow[] };
}

export const careHubRepo = {
  parcels(q?: string, f: Co & { status?: ParcelStatus; type?: ParcelType } = {}, now: Date = new Date()): TrackedParcel[] {
    const hit = matcher(q);
    const s = getStore();
    return parcelsRepo.listRows({ companyId: f.companyId, status: f.status })
      .filter((p) => !f.type || p.parcelType === f.type)
      .map((p): TrackedParcel => {
        const raw = s.parcels.find((x) => x.id === p.id)!;
        const open = !["DELIVERED", "CANCELLED", "RETURNED", "LOST"].includes(p.status);
        return { ...p, expectedAt: raw.expectedDeliveryAt, deliveredAt: raw.actualDeliveryAt, late: open && Date.parse(raw.expectedDeliveryAt) < now.getTime() };
      })
      .filter((p) => hit(p.parcelCode, p.trackingNumber, p.senderName, p.recipientName, p.routeLabel, p.companyName));
  },

  customers(q?: string, f: { status?: UserStatus; corporate?: boolean; tier?: MembershipType } = {}): TieredCustomer[] {
    const hit = matcher(q);
    const accounts = getStore().loyaltyAccounts;
    const rank = { REGULAR: 0, VIP: 1, PREMIUM: 2 } as const;
    return customersRepo.listRows()
      .map((c): TieredCustomer => {
        const mine = accounts.filter((a) => a.customerId === c.id);
        const tier = mine.length ? mine.reduce((m, a) => (rank[a.membershipType] > rank[m] ? a.membershipType : m), "REGULAR" as MembershipType) : null;
        return { ...c, tier };
      })
      .filter((c) => (!f.status || c.userStatus === f.status) && (f.corporate === undefined || c.isCorporate === f.corporate) && (!f.tier || c.tier === f.tier))
      .filter((c) => hit(c.name, c.tier, c.isCorporate ? "entreprise" : "particulier"));
  },

  programs(q?: string, f: Co = {}): LoyaltyProgramRow[] {
    const hit = matcher(q);
    return loyaltyRepo.listPrograms(f).filter((p) => hit(p.name, p.companyName));
  },

  feedbacks(q?: string, f: Co & { status?: FeedbackStatus; rating?: number } = {}): FeedbackRow[] {
    const hit = matcher(q);
    return feedbackRepo.listRows({ companyId: f.companyId, status: f.status })
      .filter((x) => !f.rating || x.rating === f.rating)
      .filter((x) => hit(x.title, x.customerName, x.companyName));
  },

  counts(q?: string, f: Co = {}): Record<CareTab, number> {
    return {
      apercu: 0, colis: careHubRepo.parcels(q, f).length, comptes: careHubRepo.customers(q).length,
      fidelite: careHubRepo.programs(q, f).length, avis: careHubRepo.feedbacks(q, f).length,
    };
  },

  overview(f: Co = {}, now: Date = new Date()): CareOverview {
    const s = getStore();
    const parcels = careHubRepo.parcels(undefined, f, now);
    const raw = s.parcels.filter((p) => !f.companyId || p.companyId === f.companyId);
    const byStatus: Record<ParcelStatus, number> = { PENDING: 0, IN_TRANSIT: 0, AT_HUB: 0, DELIVERED: 0, CANCELLED: 0, RETURNED: 0, LOST: 0 };
    for (const p of parcels) byStatus[p.status] += 1;
    const delivered = raw.filter((p) => p.status === "DELIVERED" && p.actualDeliveryAt);
    const closed = parcels.filter((p) => ["DELIVERED", "RETURNED", "LOST"].includes(p.status)).length;
    const late = parcels.filter((p) => p.late).sort((a, b) => a.expectedAt.localeCompare(b.expectedAt));
    const types = new Map<ParcelType, number>();
    for (const p of parcels) types.set(p.parcelType, (types.get(p.parcelType) ?? 0) + 1);

    const customers = careHubRepo.customers();
    const accounts = s.loyaltyAccounts.filter((a) => !f.companyId || a.companyId === f.companyId);
    const fb = careHubRepo.feedbacks(undefined, f);
    const distribution = [1, 2, 3, 4, 5].map((r) => fb.filter((x) => x.rating === r).length);
    return {
      parcels: {
        total: parcels.length, byStatus, deliveryRate: closed ? Math.round((byStatus.DELIVERED / closed) * 100) : null,
        avgHours: delivered.length ? Math.round(delivered.reduce((n, p) => n + (Date.parse(p.actualDeliveryAt!) - Date.parse(p.pickupAt)), 0) / delivered.length / 3_600_000) : null,
        revenue: raw.filter((p) => p.paymentStatus === "PAID" && p.currency === "XOF").reduce((n, p) => n + p.shippingFee, 0),
        late: late.slice(0, 5), lateCount: late.length, byType: [...types.entries()].map(([type, value]) => ({ type, value })).sort((a, b) => b.value - a.value),
      },
      customers: {
        total: customers.length, fresh: customers.filter((c) => now.getTime() - Date.parse(c.createdAt) <= 30 * DAY).length,
        corporate: customers.filter((c) => c.isCorporate).length,
        avgPoints: customers.length ? Math.round(customers.reduce((n, c) => n + c.totalPoints, 0) / customers.length) : 0,
        tiers: TIERS.map((tier) => ({ tier, value: accounts.filter((a) => a.membershipType === tier).length })),
        top: [...customers].sort((a, b) => b.totalPoints - a.totalPoints || a.name.localeCompare(b.name)).slice(0, 5),
      },
      reviews: {
        average: fb.length ? Math.round((fb.reduce((n, x) => n + x.rating, 0) / fb.length) * 10) / 10 : null,
        total: fb.length, distribution, pending: fb.filter((x) => x.status === "PENDING").length, recent: fb.slice(0, 4),
      },
    };
  },
};
