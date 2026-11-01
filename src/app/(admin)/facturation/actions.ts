"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { subscriptionsRepo } from "@/lib/repos/billing";

function refreshBilling(subscriptionId: string, companyId: string) {
  revalidatePath("/");
  revalidatePath("/facturation/abonnements");
  revalidatePath("/facturation/impayes");
  revalidatePath("/facturation/paiements");
  revalidatePath("/facturation/factures");
  revalidatePath(`/facturation/abonnements/${subscriptionId}`);
  revalidatePath(`/compagnies/${companyId}`);
}

export async function retrySubscriptionPayment(subscriptionId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(subscriptionId, "Abonnement");
    const attempt = subscriptionsRepo.retryPayment(subscriptionId, actor);
    refreshBilling(subscriptionId, attempt.companyId);
    // The failure is signalled by throwing inside run()'s body, AFTER the failed attempt
    // has been persisted and the pages revalidated: run() turns it into an error result.
    if (attempt.status === "failed") {
      throw new Error(`Échec du paiement : ${attempt.reason ?? "motif inconnu"}`);
    }
  });
}

export async function cancelSubscription(subscriptionId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(subscriptionId, "Abonnement");
    const motif = requireReason(reason);
    const sub = subscriptionsRepo.cancel(subscriptionId, motif, actor);
    refreshBilling(subscriptionId, sub.companyId);
  });
}
