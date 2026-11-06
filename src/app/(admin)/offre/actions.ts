"use server";
import { apiCall } from "@/lib/api/http";
import { isLive } from "@/lib/api/config";

import { revalidatePath } from "next/cache";
import { notWiredInLive, runLive, requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { kycTypesRepo } from "@/lib/repos/billing";

export async function setKycTypeActive(code: string, active: boolean, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(code, "Type de document");
      if (typeof active !== "boolean") throw new Error("État invalide");
      const motif = requireReason(reason);
      const types = await apiCall<{ id: string; code: string }[]>("/company-document-types", { token });
      const type = (Array.isArray(types) ? types : []).find((t) => t.code === code);
      if (!type) throw new Error("Type de document introuvable");
      await apiCall(`/company-document-types/${encodeURIComponent(type.id)}`, { method: "PATCH", body: { active, reason: motif }, token });
      revalidatePath("/offre-facturation");
      revalidatePath("/offre-facturation/documents");
    });
  }
  return run((actor) => {
    requireString(code, "Type de document");
    if (typeof active !== "boolean") throw new Error("État invalide");
    const motif = requireReason(reason);
    kycTypesRepo.setActive(code, active, motif, actor);
    revalidatePath("/offre-facturation");
    revalidatePath("/offre/types-documents-kyc");
    revalidatePath("/compagnies");
    revalidatePath("/compagnies/kyc");
    revalidatePath("/");
  });
}
