"use server";

import { revalidatePath } from "next/cache";
import { notWiredInLive, requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { feedbackRepo } from "@/lib/repos/clients";

export async function ignoreFeedback(feedbackId: string, reason: string): Promise<ActionResult> {
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(feedbackId, "Avis");
    const motif = requireReason(reason);
    const feedback = feedbackRepo.ignore(feedbackId, motif, actor);
    revalidatePath("/clients/avis");
    revalidatePath(`/clients/avis/${feedback.id}`);
    revalidatePath(`/clients/comptes/${feedback.customerId}`);
    revalidatePath(`/compagnies/${feedback.companyId}`);
  });
}
