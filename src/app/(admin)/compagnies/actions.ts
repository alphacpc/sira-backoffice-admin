"use server";

import { revalidatePath } from "next/cache";
import {
  errorMessage, notWiredInLive, requireReason, requireString, run, runLive, SESSION_EXPIRED, type ActionResult,
} from "@/lib/actions/run";
import { apiCall } from "@/lib/api/http";
import { liveKycBoard } from "@/lib/api/kyc-live";
import { liveRevealContact } from "@/lib/api/company-detail-live";
import { isLive } from "@/lib/api/config";
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

/** Live: the platform reviews a document under its company; the review is journalled there. */
function liveReview(docId: string, companyId: string, status: "APPROVED" | "REJECTED", reason?: string): Promise<ActionResult> {
  return runLive(async (token) => {
    requireString(docId, "Document");
    requireString(companyId, "Compagnie");
    await apiCall(`/companies/${encodeURIComponent(companyId)}/documents/${encodeURIComponent(docId)}/review`, {
      method: "PATCH", token, body: status === "REJECTED" ? { status, rejectionReason: requireReason(reason) } : { status },
    });
    refresh(companyId);
  });
}

export async function approveDocument(docId: string, companyId = ""): Promise<ActionResult> {
  if (isLive()) return liveReview(docId, companyId, "APPROVED");
  return run((actor) => {
    requireString(docId, "Document");
    const doc = companiesRepo.reviewDocument(docId, "approved", undefined, actor);
    refresh(doc.companyId);
  });
}

export async function rejectDocument(docId: string, reason: string, companyId = ""): Promise<ActionResult> {
  if (isLive()) return liveReview(docId, companyId, "REJECTED", reason);
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
  const inert = await notWiredInLive();
  if (inert) return inert;
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
  if (isLive()) {
    return runLive(async (token) => {
      requireString(companyId, "Compagnie");
      if (!KYC_STAGES.includes(stage as KycStage)) throw new Error("Étape invalide");
      const motif = note?.trim() ? requireReason(note) : undefined;
      await apiCall(`/admin/companies/${encodeURIComponent(companyId)}/kyc-stage`, {
        method: "PATCH", token, body: { stage, ...(motif ? { note: motif } : {}) },
      });
      refresh(companyId);
    });
  }
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
  if (isLive()) {
    try {
      return { ok: true, board: await liveKycBoard(clean) };
    } catch {
      return { ok: false, error: "La plateforme est indisponible, réessaie dans un instant." };
    }
  }
  return { ok: true, board: companiesRepo.kycBoard(clean) };
}

export async function forceActivateCompany(companyId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(companyId, "Compagnie");
      await apiCall(`/companies/${encodeURIComponent(companyId)}/force-activate`, {
        method: "POST", token, body: { reason: requireReason(reason) },
      });
      refresh(companyId);
    });
  }
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
    // Live: the platform journals the reveal itself; the value is returned and never logged here.
    if (isLive()) return { ok: true, value: await liveRevealContact(companyId, field) };
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    companiesRepo.logReveal(companyId, field, actor);
    revalidatePath(`/compagnies/${companyId}`);
    return { ok: true, value: field === "email" ? company.contactEmail : company.contactPhone };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}
