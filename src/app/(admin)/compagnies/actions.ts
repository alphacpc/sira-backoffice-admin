"use server";

import { revalidatePath } from "next/cache";
import {
  errorMessage, requireReason, requireString, run, SESSION_EXPIRED, type ActionResult,
} from "@/lib/actions/run";
import { requireSession } from "@/lib/auth/session";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore } from "@/lib/repos/store";

function refresh(companyId: string | null) {
  revalidatePath("/");
  revalidatePath("/compagnies");
  revalidatePath("/compagnies/kyc");
  if (companyId) revalidatePath(`/compagnies/${companyId}`);
}

export async function approveDocument(docId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(docId, "Document");
    const doc = companiesRepo.reviewDocument(docId, "approved", undefined, actor);
    refresh(doc.companyId);
  });
}

export async function rejectDocument(docId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(docId, "Document");
    const motif = requireReason(reason);
    const doc = companiesRepo.reviewDocument(docId, "rejected", motif, actor);
    refresh(doc.companyId);
  });
}

export async function forceActivateCompany(companyId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(companyId, "Compagnie");
    const motif = requireReason(reason);
    companiesRepo.forceActivate(companyId, motif, actor);
    refresh(companyId);
  });
}

export type RevealResult = { ok: true; value: string } | { ok: false; error: string };

export async function revealContact(companyId: string, field: "email" | "phone"): Promise<RevealResult> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    requireString(companyId, "Compagnie");
    if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    companiesRepo.logReveal(companyId, field, actor);
    revalidatePath(`/compagnies/${companyId}`);
    return { ok: true, value: field === "email" ? company.contactEmail : company.contactPhone };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
