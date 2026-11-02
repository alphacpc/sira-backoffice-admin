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

export async function declareIncident(input: IncidentInput): Promise<ActionResult> {
  return run((actor) => {
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
    refreshIncident(incidentsRepo.setPostmortem(incidentId, url, actor));
  });
}
