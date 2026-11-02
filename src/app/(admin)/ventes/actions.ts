"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { bookingsRepo } from "@/lib/repos/sales";

export async function cancelBooking(bookingId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(bookingId, "Réservation");
    const motif = requireReason(reason);
    const booking = bookingsRepo.cancel(bookingId, motif, actor);
    revalidatePath("/");
    revalidatePath("/ventes/reservations");
    revalidatePath(`/ventes/reservations/${booking.id}`);
    revalidatePath("/ventes/en-ligne");
    revalidatePath(`/flotte/trajets/${booking.tripId}`);
    revalidatePath("/flotte/plans-de-sieges");
    revalidatePath(`/compagnies/${booking.companyId}`);
  });
}
