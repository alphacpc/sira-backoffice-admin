"use server";
import { isLive } from "@/lib/api/config";
import { apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";

import { revalidatePath } from "next/cache";
import { notWiredInLive, runLive, requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { feedbackRepo } from "@/lib/repos/clients";

export async function ignoreFeedback(feedbackId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(feedbackId, "Avis");
      requireReason(reason);
      await apiCall(`/admin/feedbacks/${encodeURIComponent(feedbackId)}/status`, { method: "PATCH", body: { status: "IGNORED", reason }, token });
      revalidatePath("/colis-clients");
      revalidatePath(`/clients/avis/${feedbackId}`);
    });
  }
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
