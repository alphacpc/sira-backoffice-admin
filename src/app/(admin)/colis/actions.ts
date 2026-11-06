"use server";

import { revalidatePath } from "next/cache";
import {
  notWiredInLive, requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { parcelsRepo } from "@/lib/repos/parcels";

export async function declareParcelLost(parcelId: string, reason: string): Promise<ActionResult> {
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(parcelId, "Colis");
    const motif = requireReason(reason);
    const parcel = parcelsRepo.declareLost(parcelId, motif, actor);
    revalidatePath("/");
    revalidatePath("/colis");
    revalidatePath(`/colis/${parcel.id}`);
    revalidatePath(`/compagnies/${parcel.companyId}`);
  });
}

export async function revealParcelRecipientPhone(parcelId: string): Promise<RevealResult> {
  const inert = await notWiredInLive();
  if (inert && !inert.ok) return inert;
  return runReveal((actor) => {
    requireString(parcelId, "Colis");
    const parcel = parcelsRepo.get(parcelId);
    if (!parcel) throw new Error("Colis introuvable");
    parcelsRepo.logReveal(parcelId, actor);
    revalidatePath(`/colis/${parcelId}`);
    revalidatePath(`/compagnies/${parcel.companyId}`);
    return parcel.recipientPhone;
  });
}
