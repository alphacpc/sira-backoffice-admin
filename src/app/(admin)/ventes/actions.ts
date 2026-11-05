"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { rentalInvoicesRepo } from "@/lib/repos/rental-invoices";
import type { InvoiceTemplate } from "@/lib/types";
import { rentalsRepo } from "@/lib/repos/rentals";
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

function refreshRental(id: string, companyId: string): void {
  revalidatePath("/ventes/locations");
  revalidatePath(`/ventes/locations/${id}`);
  revalidatePath(`/compagnies/${companyId}`);
}

export async function quoteRental(id: string, amount: number): Promise<ActionResult> {
  return run((actor) => { requireString(id, "Location"); const r = rentalsRepo.quote(id, Number(amount), actor); refreshRental(r.id, r.companyId); });
}
export async function assignRental(id: string, busId: string, driverId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(id, "Location"); requireString(busId, "Bus"); requireString(driverId, "Chauffeur");
    const r = rentalsRepo.assign(id, busId, driverId, actor); refreshRental(r.id, r.companyId);
  });
}
export async function payRental(id: string, amount: number): Promise<ActionResult> {
  return run((actor) => { requireString(id, "Location"); const r = rentalsRepo.recordPayment(id, Number(amount), actor); refreshRental(r.id, r.companyId); });
}
export async function confirmRental(id: string): Promise<ActionResult> {
  return run((actor) => { requireString(id, "Location"); const r = rentalsRepo.confirm(id, actor); refreshRental(r.id, r.companyId); });
}
export async function completeRental(id: string): Promise<ActionResult> {
  return run((actor) => { requireString(id, "Location"); const r = rentalsRepo.complete(id, actor); refreshRental(r.id, r.companyId); });
}
export async function cancelRental(id: string, reason: string): Promise<ActionResult> {
  return run((actor) => { requireString(id, "Location"); const r = rentalsRepo.cancel(id, requireReason(reason), actor); refreshRental(r.id, r.companyId); });
}

export async function payRentalInvoice(number: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(number, "Facture");
    rentalInvoicesRepo.payInFull(number, actor);
    const inv = rentalInvoicesRepo.byNumber(number)!;
    revalidatePath(`/ventes/factures/${number}`);
    revalidatePath("/ventes/factures");
    refreshRental(inv.rentalId, inv.companyId);
  });
}

export async function saveInvoiceTemplate(companyId: string, template: InvoiceTemplate): Promise<ActionResult> {
  return run((actor) => {
    requireString(companyId, "Compagnie");
    rentalInvoicesRepo.saveTemplate(companyId, template, actor);
    revalidatePath(`/compagnies/${companyId}/modele-facture`);
    revalidatePath("/ventes/factures", "layout");
  });
}
