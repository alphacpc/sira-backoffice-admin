"use server";

import { revalidatePath } from "next/cache";
import { requireString, run, type ActionResult } from "@/lib/actions/run";
import { incidentsRepo, type IncidentInput } from "@/lib/repos/monitoring";
import type { IncidentStatus, SystemIncident } from "@/lib/types";

function refreshIncident(incident: SystemIncident) {
  revalidatePath("/");
  revalidatePath("/supervision/incidents");
  revalidatePath(`/supervision/incidents/${incident.id}`);
  revalidatePath("/supervision/services");
  revalidatePath("/conformite/journal-audit");
  if (incident.affectedCompanyId) revalidatePath(`/compagnies/${incident.affectedCompanyId}`);
}

/** Server actions are public endpoints: a field of the wrong type must fail with a clean message, not a TypeError. */
function requireText(value: unknown, label: string): void {
  if (typeof value !== "string") throw new Error(`${label} invalide`);
}

export async function declareIncident(input: IncidentInput): Promise<ActionResult> {
  return run((actor) => {
    const raw = input as Partial<Record<keyof IncidentInput, unknown>> | null | undefined;
    if (typeof raw !== "object" || raw === null) throw new Error("Incident invalide");
    requireText(raw.title, "Titre");
    requireText(raw.serviceName, "Service");
    requireText(raw.description, "Description");
    refreshIncident(incidentsRepo.declare(input, actor));
  });
}

export async function advanceIncident(incidentId: string, target: IncidentStatus): Promise<ActionResult> {
  return run((actor) => {
    requireString(incidentId, "Incident");
    refreshIncident(incidentsRepo.advance(incidentId, target, actor));
  });
}

export async function setIncidentPostmortem(incidentId: string, url: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(incidentId, "Incident");
    requireText(url, "URL");
    refreshIncident(incidentsRepo.setPostmortem(incidentId, url, actor));
  });
}
