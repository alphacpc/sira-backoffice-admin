import { beforeEach, describe, expect, it } from "vitest";
import { bookingsRepo } from "@/lib/repos/sales";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const named = (name: string) => getStore().bookings.find((b) => b.passengerName === name)!;
const cancel = (name: string, reason = "Demande du passager") =>
  bookingsRepo.cancel(named(name).id, reason, "tester@sira.app", NOW);
const seatOf = (b: { tripId: string; seatNumber: string | null }) =>
  getStore().seatMaps.find((m) => m.tripId === b.tripId)!.seats.find((x) => x.code === b.seatNumber)!;
const tripOf = (b: { tripId: string }) => getStore().trips.find((t) => t.id === b.tripId)!;

describe("cancelling a booking", () => {
  it("cancels an unpaid booking, frees its seat, restores the trip's availability and journals it", () => {
    const target = named("Rokhaya Thiaw");
    const trip = tripOf(target);
    const free = trip.availableSeats;
    expect(seatOf(target).state).toBe("booked");
    const n = getStore().activity.length;
    const result = cancel("Rokhaya Thiaw", "  Demande du passager  ");
    expect(result).toBe(target);
    expect(target.status).toBe("cancelled");
    expect(target.cancelledAt).toBe(NOW.toISOString());
    expect(target.cancelReason).toBe("PLATFORM");
    expect(seatOf(target).state).toBe("free");
    expect(trip.availableSeats).toBe(free + 1);
    expect(trip.availableSeats).toBe(getStore().seatMaps.find((m) => m.tripId === trip.id)!.seats.filter((x) => x.state === "free").length);
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Réservation ${target.bookingCode} annulée. Motif : Demande du passager`,
    });
  });

  it("cancels a booking whose only payment failed", () => {
    const failed = getStore().bookings.find((b) => b.paymentStatus === "failed" && b.status === "confirmed")!;
    bookingsRepo.cancel(failed.id, "Paiement abandonné", "tester@sira.app", NOW);
    expect(failed.status).toBe("cancelled");
    expect(seatOf(failed).state).toBe("free");
  });

  it("refuses an unknown booking", () => {
    expect(() => bookingsRepo.cancel("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Réservation introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = named("Rokhaya Thiaw");
    const n = getStore().activity.length;
    expect(() => cancel("Rokhaya Thiaw", "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("confirmed");
    expect(seatOf(target).state).toBe("booked");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a booking that is already cancelled", () => {
    const cancelled = getStore().bookings.find((b) => b.status === "cancelled")!;
    const trip = tripOf(cancelled);
    const free = trip.availableSeats;
    expect(() => bookingsRepo.cancel(cancelled.id, "motif")).toThrow("Cette réservation est déjà annulée");
    expect(trip.availableSeats).toBe(free);
  });

  it("refuses a paid booking and leaves its seat and ticket untouched", () => {
    const paid = named("Coumba Lô");
    expect(() => cancel("Coumba Lô")).toThrow("Une réservation payée ne peut pas être annulée");
    expect(paid.status).toBe("confirmed");
    expect(seatOf(paid).state).toBe("occupied");
    expect(getStore().tickets.filter((t) => t.bookingId === paid.id)).toHaveLength(1);
  });

  it("refuses a booking with a payment in progress", () => {
    const busy = named("Samba Kébé");
    expect(() => cancel("Samba Kébé")).toThrow("Un paiement est en cours sur cette réservation");
    expect(busy.status).toBe("confirmed");
    expect(seatOf(busy).state).toBe("booked");
  });

  it("checks the guards in order: unknown, reason, already cancelled, paid, payment in progress", () => {
    // A cancelled booking with a blank reason reports the reason first.
    const cancelled = getStore().bookings.find((b) => b.status === "cancelled")!;
    expect(() => bookingsRepo.cancel(cancelled.id, "")).toThrow("Un motif est obligatoire");
    // A paid booking that is also cancelled reports "already cancelled" first.
    const both = named("Coumba Lô");
    both.status = "cancelled";
    expect(() => cancel("Coumba Lô")).toThrow("Cette réservation est déjà annulée");
    // A paid booking that also has a pending payment reports "paid" before "payment in progress".
    resetStore(NOW);
    const paid = named("Coumba Lô");
    getStore().transactions.push({ ...getStore().transactions.find((t) => t.bookingId === paid.id)!, id: "extra", status: "PENDING", completedAt: null });
    expect(() => cancel("Coumba Lô")).toThrow("Une réservation payée ne peut pas être annulée");
  });

  it("does not release a seat that is not booked", () => {
    const target = named("Rokhaya Thiaw");
    const trip = tripOf(target);
    seatOf(target).state = "free";
    const free = trip.availableSeats;
    cancel("Rokhaya Thiaw");
    expect(trip.availableSeats).toBe(free);
  });
});
