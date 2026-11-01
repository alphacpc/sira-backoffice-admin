"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { kycTypesRepo } from "@/lib/repos/billing";

export async function setKycTypeActive(code: string, active: boolean, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(code, "Type de document");
    if (typeof active !== "boolean") throw new Error("État invalide");
    const motif = requireReason(reason);
    kycTypesRepo.setActive(code, active, motif, actor);
    revalidatePath("/offre/types-documents-kyc");
    revalidatePath("/compagnies");
    revalidatePath("/compagnies/kyc");
    revalidatePath("/");
  });
}
