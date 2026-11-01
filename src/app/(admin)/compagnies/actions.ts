"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore } from "@/lib/repos/store";

export type ActionResult = { ok: true } | { ok: false; error: string };

const SESSION_EXPIRED = "Session expirée, reconnecte-toi";

function refresh(companyId: string | null) {
  revalidatePath("/");
  revalidatePath("/compagnies");
  revalidatePath("/compagnies/kyc");
  if (companyId) revalidatePath(`/compagnies/${companyId}`);
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} invalide`);
  return value;
}

/** Runs an action body after the session check; never throws for expected failures. */
async function run(body: (sub: string) => void): Promise<ActionResult> {
  let sub: string;
  try {
    sub = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    body(sub);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Action impossible" };
  }
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
    requireString(reason, "Motif");
    const doc = companiesRepo.reviewDocument(docId, "rejected", reason.trim(), actor);
    refresh(doc.companyId);
  });
}

export async function forceActivateCompany(companyId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(companyId, "Compagnie");
    requireString(reason, "Motif");
    companiesRepo.forceActivate(companyId, reason.trim(), actor);
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
    return { ok: false, error: e instanceof Error && e.message ? e.message : "Action impossible" };
  }
}
