"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore } from "@/lib/repos/store";

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

export async function approveDocument(docId: string): Promise<void> {
  const session = await requireSession();
  requireString(docId, "Document");
  const doc = companiesRepo.reviewDocument(docId, "approved", undefined, session.sub);
  refresh(doc.companyId);
}

export async function rejectDocument(docId: string, reason: string): Promise<void> {
  const session = await requireSession();
  requireString(docId, "Document");
  requireString(reason, "Motif");
  const doc = companiesRepo.reviewDocument(docId, "rejected", reason.trim(), session.sub);
  refresh(doc.companyId);
}

export async function forceActivateCompany(companyId: string, reason: string): Promise<void> {
  const session = await requireSession();
  requireString(companyId, "Compagnie");
  requireString(reason, "Motif");
  companiesRepo.forceActivate(companyId, reason.trim(), session.sub);
  refresh(companyId);
}

export async function revealContact(companyId: string, field: "email" | "phone"): Promise<void> {
  const session = await requireSession();
  requireString(companyId, "Compagnie");
  if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
  if (!getStore().companies.some((c) => c.id === companyId)) throw new Error("Compagnie introuvable");
  companiesRepo.logReveal(companyId, field, session.sub);
  revalidatePath(`/compagnies/${companyId}`);
}
