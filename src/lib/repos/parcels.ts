import { maskPhone } from "@/lib/mask";
import { addActivity } from "@/lib/repos/activity";
import { routeLabel } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type { Parcel, ParcelPaymentStatus, ParcelStatus, ParcelType, TripStatus } from "@/lib/types";

export const PARCEL_STATUSES = ["PENDING", "IN_TRANSIT", "AT_HUB", "DELIVERED", "CANCELLED", "RETURNED", "LOST"] as const;

/** Terminal statuses: nothing can happen to such a parcel any more. */
export const CLOSED_PARCEL_STATUSES: readonly ParcelStatus[] = ["DELIVERED", "CANCELLED", "RETURNED", "LOST"];

/** Client-safe projection of a parcel: no phone. */
export interface ParcelRow {
  id: string; parcelCode: string; trackingNumber: string; companyId: string; companyName: string;
  senderName: string; recipientName: string; routeLabel: string; parcelType: ParcelType; weightKg: number;
  shippingFee: number; currency: string; status: ParcelStatus; paymentStatus: ParcelPaymentStatus;
  legCount: number; createdAt: string;
}

export interface ParcelLegRow {
  id: string; sequence: number; assignmentCode: string; tripId: string; routeLabel: string;
  departure: string; tripStatus: TripStatus;
}

export interface ParcelHistoryRow {
  id: string; previousStatus: ParcelStatus | null; newStatus: ParcelStatus;
  notes: string | null; changedBy: string | null; changedAt: string;
}

export interface ParcelDetail {
  parcel: Parcel;
  companyName: string;
  originName: string;
  destinationName: string;
  routeLabel: string;
  /** Always masked: the real number only comes from the journaled reveal action. */
  recipientPhoneMasked: string;
  legs: ParcelLegRow[];
  history: ParcelHistoryRow[];
  lostBlockedReason: string | null;
}

function companyName(companyId: string): string {
  return getStore().companies.find((c) => c.id === companyId)?.name ?? "—";
}

function stationName(stationId: string): string {
  const station = getStore().stations.find((x) => x.id === stationId);
  return station ? `${station.name}` : "—";
}

/** Why a parcel cannot be declared lost, `null` when it can. Same order as the guards. */
export function lostBlockReason(parcel: Parcel): string | null {
  if (CLOSED_PARCEL_STATUSES.includes(parcel.status)) return "Ce colis est déjà clos";
  if (parcel.status === "PENDING") return "Un colis en attente ne peut pas être déclaré perdu";
  return null;
}

function parcelRoute(parcel: Parcel): string {
  const trip = getStore().trips.find((t) => t.id === parcel.tripId);
  return trip ? routeLabel(trip.routeId) : "—";
}

function parcelRow(p: Parcel): ParcelRow {
  const s = getStore();
  return {
    id: p.id, parcelCode: p.parcelCode, trackingNumber: p.trackingNumber, companyId: p.companyId,
    companyName: companyName(p.companyId), senderName: p.senderName, recipientName: p.recipientName,
    routeLabel: parcelRoute(p), parcelType: p.parcelType, weightKg: p.weightKg, shippingFee: p.shippingFee,
    currency: p.currency, status: p.status, paymentStatus: p.paymentStatus,
    legCount: s.parcelLegs.filter((l) => l.parcelId === p.id).length, createdAt: p.createdAt,
  };
}

export const parcelsRepo = {
  listRows(filter: { companyId?: string; status?: ParcelStatus } = {}): ParcelRow[] {
    return getStore().parcels
      .filter((p) => (!filter.companyId || p.companyId === filter.companyId) && (!filter.status || p.status === filter.status))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .map(parcelRow);
  },

  get(id: string): Parcel | undefined {
    return getStore().parcels.find((p) => p.id === id);
  },

  detail(id: string): ParcelDetail | undefined {
    const s = getStore();
    const parcel = s.parcels.find((p) => p.id === id);
    if (!parcel) return undefined;
    const legs = s.parcelLegs
      .filter((l) => l.parcelId === id)
      .sort((a, b) => a.sequence - b.sequence)
      .map((l): ParcelLegRow => {
        const trip = s.trips.find((t) => t.id === l.tripId);
        return {
          id: l.id, sequence: l.sequence, assignmentCode: l.assignmentCode, tripId: l.tripId,
          routeLabel: trip ? routeLabel(trip.routeId) : "—", departure: trip?.departure ?? "",
          tripStatus: trip?.status ?? "planned",
        };
      });
    const history = s.parcelHistory
      .filter((h) => h.parcelId === id)
      .sort((a, b) => a.changedAt.localeCompare(b.changedAt) || a.id.localeCompare(b.id))
      .map((h): ParcelHistoryRow => ({
        id: h.id, previousStatus: h.previousStatus, newStatus: h.newStatus, notes: h.notes,
        changedBy: h.changedBy, changedAt: h.changedAt,
      }));
    return {
      parcel, companyName: companyName(parcel.companyId),
      originName: stationName(parcel.originStationId), destinationName: stationName(parcel.destinationStationId),
      routeLabel: parcelRoute(parcel), recipientPhoneMasked: maskPhone(parcel.recipientPhone),
      legs, history, lostBlockedReason: lostBlockReason(parcel),
    };
  },

  /**
   * Declares a parcel lost. Guards, in this order: parcel exists, reason, not closed, not pending.
   * Only `IN_TRANSIT` and `AT_HUB` parcels pass.
   */
  declareLost(parcelId: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Parcel {
    const s = getStore();
    const parcel = s.parcels.find((p) => p.id === parcelId);
    if (!parcel) throw new Error("Colis introuvable");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    const blocked = lostBlockReason(parcel);
    if (blocked) throw new Error(blocked);
    const previous = parcel.status;
    parcel.status = "LOST";
    s.parcelHistory.push({
      id: `hist-${now.getTime()}-${s.parcelHistory.length + 1}`, parcelId: parcel.id,
      previousStatus: previous, newStatus: "LOST", notes: motif, changedBy: actor, changedAt: now.toISOString(),
    });
    addActivity(parcel.companyId, actor, `Colis ${parcel.parcelCode} déclaré perdu. Motif : ${motif}`, now);
    return parcel;
  },

  /** Journals the reveal of the recipient phone; the number itself is never written to the log. */
  logReveal(parcelId: string, actor = "admin@sira.app", now: Date = new Date()): void {
    const parcel = getStore().parcels.find((p) => p.id === parcelId);
    if (!parcel) throw new Error("Colis introuvable");
    addActivity(
      parcel.companyId, actor, `Donnée personnelle révélée : téléphone du destinataire du colis ${parcel.parcelCode}`, now,
    );
  },
};
