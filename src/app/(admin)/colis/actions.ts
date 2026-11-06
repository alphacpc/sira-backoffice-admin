"use server";
import { isLive } from "@/lib/api/config";
import { apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";

import { revalidatePath } from "next/cache";
import {
  notWiredInLive, runLive, requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { parcelsRepo } from "@/lib/repos/parcels";

export async function declareParcelLost(parcelId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(parcelId, "Colis");
      const motif = requireReason(reason);
      await apiCall(`/admin/parcels/${encodeURIComponent(parcelId)}/declare-lost`, { method: "POST", body: { reason: motif }, token });
      revalidatePath("/colis-clients");
      revalidatePath(`/colis/${parcelId}`);
    });
  }
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
  if (isLive()) {
    try {
      requireString(parcelId, "Colis");
      const token = await currentBackendToken();
      const res = await apiCall<{ value?: string }>(`/admin/parcels/${encodeURIComponent(parcelId)}/recipient-phone/reveal`, { method: "POST", token });
      return typeof res?.value === "string" ? { ok: true, value: res.value } : { ok: false, error: "Valeur indisponible" };
    } catch {
      return { ok: false, error: "Impossible de révéler cette valeur pour le moment." };
    }
  }
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
