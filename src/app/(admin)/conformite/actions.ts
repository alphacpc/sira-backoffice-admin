"use server";
import { apiCall } from "@/lib/api/http";
import { isLive } from "@/lib/api/config";

import { revalidatePath } from "next/cache";
import {
  notWiredInLive, runLive, requireReason, requireString, run, runValue, type ActionResult, type ValueResult,
} from "@/lib/actions/run";
import { consentsRepo, dsrRepo, retentionRepo, type ConsentEntryView } from "@/lib/repos/compliance";
import type { DataSubjectRequest } from "@/lib/types";

function refreshRequest(request: DataSubjectRequest) {
  revalidatePath("/");
  revalidatePath("/conformite/demandes-rgpd");
  revalidatePath(`/conformite/demandes-rgpd/${request.id}`);
  revalidatePath("/conformite/journal-audit");
  revalidatePath("/conformite/acces-donnees");
  if (request.companyId) revalidatePath(`/compagnies/${request.companyId}`);
}

export async function startDataSubjectRequest(requestId: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(requestId, "Demande");
      await apiCall(`/data-subject-requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: { status: "IN_PROGRESS" }, token });
      revalidatePath("/conformite/demandes-rgpd");
      revalidatePath(`/conformite/demandes-rgpd/${requestId}`);
    });
  }
  return run((actor) => {
    requireString(requestId, "Demande");
    refreshRequest(dsrRepo.transition(requestId, "IN_PROGRESS", "", actor));
  });
}

export async function completeDataSubjectRequest(requestId: string, notes: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(requestId, "Demande");
      const text = requireReason(notes);
      await apiCall(`/data-subject-requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: { status: "COMPLETED", resolutionNotes: text }, token });
      revalidatePath("/conformite/demandes-rgpd");
      revalidatePath(`/conformite/demandes-rgpd/${requestId}`);
    });
  }
  return run((actor) => {
    requireString(requestId, "Demande");
    const text = requireReason(notes);
    refreshRequest(dsrRepo.transition(requestId, "COMPLETED", text, actor));
  });
}

export async function rejectDataSubjectRequest(requestId: string, notes: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(requestId, "Demande");
      const text = requireReason(notes);
      await apiCall(`/data-subject-requests/${encodeURIComponent(requestId)}`, { method: "PATCH", body: { status: "REJECTED", resolutionNotes: text }, token });
      revalidatePath("/conformite/demandes-rgpd");
      revalidatePath(`/conformite/demandes-rgpd/${requestId}`);
    });
  }
  return run((actor) => {
    requireString(requestId, "Demande");
    const text = requireReason(notes);
    refreshRequest(dsrRepo.transition(requestId, "REJECTED", text, actor));
  });
}

export async function setCompanyRetention(companyId: string, days: number, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(companyId, "Compagnie");
      requireReason(reason);
      if (!Number.isInteger(days)) throw new Error("Durée invalide");
      await apiCall(`/companies/${encodeURIComponent(companyId)}`, { method: "PATCH", body: { dataRetentionDays: days }, token });
      revalidatePath("/conformite/retention");
      revalidatePath("/conformite");
    });
  }
  return run((actor) => {
    requireString(companyId, "Compagnie");
    const motif = requireReason(reason);
    const company = retentionRepo.set(companyId, days, motif, actor);
    revalidatePath("/conformite/retention");
    revalidatePath("/conformite/journal-audit");
    revalidatePath(`/compagnies/${company.id}`);
  });
}

export async function consultUserConsents(userId: string, accessReason: string): Promise<ValueResult<ConsentEntryView[]>> {
  const inert = await notWiredInLive();
  if (inert) return inert as ValueResult<ConsentEntryView[]>;
  return runValue((actor) => {
    requireString(userId, "Utilisateur");
    const entries = consentsRepo.consult(userId, accessReason, actor);
    revalidatePath("/conformite/acces-donnees");
    return entries;
  });
}
