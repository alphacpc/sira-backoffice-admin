"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { notWiredInLive, requireReason, requireString, run, runReveal, type ActionResult, type RevealResult } from "@/lib/actions/run";
import { invoicesRepo, REMINDER_CHANNELS, remindOwner, resendInvoice, subscriptionsRepo, type ReminderChannel } from "@/lib/repos/billing";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore } from "@/lib/repos/store";

function refreshBilling(subscriptionId: string, companyId: string) {
  revalidatePath("/");
  revalidatePath("/offre-facturation");
  revalidatePath("/facturation/abonnements");
  revalidatePath("/facturation/impayes");
  revalidatePath("/facturation/paiements");
  revalidatePath("/facturation/factures");
  revalidatePath(`/facturation/abonnements/${subscriptionId}`);
  revalidatePath(`/compagnies/${companyId}`);
}

export async function retrySubscriptionPayment(subscriptionId: string): Promise<ActionResult> {
  const inert = await notWiredInLive();
  if (inert) return inert;
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
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(subscriptionId, "Abonnement");
    const motif = requireReason(reason);
    const sub = subscriptionsRepo.cancel(subscriptionId, motif, actor);
    refreshBilling(subscriptionId, sub.companyId);
  });
}

/** Reveals the e-mail or phone of the company owner (its manager); the access is journalised. */
export async function revealOwnerContact(companyId: string, field: "email" | "phone"): Promise<RevealResult> {
  return runReveal((actor) => {
    requireString(companyId, "Compagnie");
    if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
    const owner = getStore().employees.find((e) => e.companyId === companyId && e.role === "MANAGER");
    if (!owner) throw new Error("Propriétaire introuvable");
    companiesRepo.logReveal(companyId, field, actor);
    return field === "email" ? owner.email : owner.phone;
  });
}

export async function remindSubscriptionOwner(subscriptionId: string, channel: string, message: string): Promise<ActionResult> {
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(subscriptionId, "Abonnement");
    if (!(REMINDER_CHANNELS as readonly string[]).includes(channel)) throw new Error("Canal invalide");
    remindOwner(subscriptionId, channel as ReminderChannel, typeof message === "string" ? message : "", actor);
    revalidatePath("/offre-facturation/abonnements");
  });
}

export interface InvoicePreview {
  id: string; number: string; companyId: string; companyName: string; amount: number; currency: string;
  status: "paid" | "failed"; issuedAt: string; planName: string | null; billingCycle: "MONTHLY" | "YEARLY" | null;
  subscriptionId: string | null; paymentAt: string | null; paymentStatus: "paid" | "failed" | null;
}
export type InvoicePreviewResult = { ok: true; invoice: InvoicePreview } | { ok: false; error: string };

/** Everything the invoice modal shows; no contact data. */
export async function getInvoicePreview(invoiceId: string): Promise<InvoicePreviewResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: "Session expirée, reconnecte-toi" };
  }
  const detail = typeof invoiceId === "string" ? invoicesRepo.detail(invoiceId) : undefined;
  if (!detail) return { ok: false, error: "Facture introuvable" };
  const { invoice, subscription, payment } = detail;
  const full = subscription ? getStore().subscriptions.find((x) => x.id === subscription.id) : undefined;
  return {
    ok: true,
    invoice: {
      id: invoice.id, number: invoice.number, companyId: invoice.companyId, companyName: detail.companyName,
      amount: invoice.amount, currency: invoice.currency, status: invoice.status, issuedAt: invoice.issuedAt,
      planName: full?.planName ?? null, billingCycle: full?.billingCycle ?? null, subscriptionId: subscription?.id ?? null,
      paymentAt: payment?.at ?? null, paymentStatus: payment?.status ?? null,
    },
  };
}

export async function resendInvoiceToOwner(invoiceId: string, channel: string): Promise<ActionResult> {
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(invoiceId, "Facture");
    if (!(REMINDER_CHANNELS as readonly string[]).includes(channel)) throw new Error("Canal invalide");
    resendInvoice(invoiceId, channel as ReminderChannel, actor);
    revalidatePath("/offre-facturation/factures");
  });
}
