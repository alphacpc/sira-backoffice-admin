"use server";

import { revalidatePath } from "next/cache";
import {
  errorMessage, requireReason, requireString, run, SESSION_EXPIRED, type ActionResult,
} from "@/lib/actions/run";
import { isBackofficeAdmin, requireSession } from "@/lib/auth/session";
import {
  companiesRepo, KYC_MIN_AGES, KYC_SORTS, KYC_STAGES, type KycBoard, type KycBoardQuery,
} from "@/lib/repos/companies";
import type { KycStage } from "@/lib/types";
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

const KYC_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const KYC_FILE_MAX = 10 * 1024 * 1024;

export async function replaceKycDocument(docId: string, formData: FormData): Promise<ActionResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  if (!(await isBackofficeAdmin())) return { ok: false, error: "Réservé à l'administrateur" };
  return run((actor) => {
    requireString(docId, "Document");
    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) throw new Error("Choisis un fichier");
    if (!KYC_FILE_TYPES.includes(file.type)) throw new Error("Format accepté : PDF, JPEG ou PNG");
    if (file.size > KYC_FILE_MAX) throw new Error("Fichier trop volumineux (10 Mo au plus)");
    const doc = companiesRepo.replaceDocument(docId, file.name.slice(0, 120), actor);
    refresh(doc.companyId);
  });
}

export async function moveKycStage(companyId: string, stage: string, note?: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(companyId, "Compagnie");
    if (!KYC_STAGES.includes(stage as KycStage)) throw new Error("Étape invalide");
    const motif = note?.trim() ? requireReason(note) : undefined;
    companiesRepo.moveKycStage(companyId, stage as KycStage, motif, actor);
    refresh(companyId);
  });
}

export type KycBoardResult = { ok: true; board: KycBoard } | { ok: false; error: string };

/** Reads one view of the board (filters, sort, page of each column). Read only, but behind the session. */
export async function fetchKycBoard(query: KycBoardQuery): Promise<KycBoardResult> {
  try {
    await requireSession();
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  const pages: KycBoardQuery["pages"] = {};
  for (const stage of KYC_STAGES) {
    const n = Number(query?.pages?.[stage]);
    if (Number.isFinite(n) && n >= 1) pages[stage] = Math.floor(n);
  }
  const clean: KycBoardQuery = {
    q: typeof query?.q === "string" ? query.q.slice(0, 80) : undefined,
    minAge: (KYC_MIN_AGES as readonly number[]).includes(Number(query?.minAge)) ? Number(query.minAge) : 0,
    tier: query?.tier === "STANDARD" || query?.tier === "SILVER" || query?.tier === "GOLD" ? query.tier : undefined,
    sort: (KYC_SORTS as readonly string[]).includes(String(query?.sort)) ? query.sort : "oldest",
    pages,
  };
  return { ok: true, board: companiesRepo.kycBoard(clean) };
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
