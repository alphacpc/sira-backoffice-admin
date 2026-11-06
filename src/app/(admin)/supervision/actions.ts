"use server";
import { apiCall } from "@/lib/api/http";
import { isLive } from "@/lib/api/config";

import { revalidatePath } from "next/cache";
import { notWiredInLive, runLive, requireString, run, type ActionResult } from "@/lib/actions/run";
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
  if (isLive()) {
    return runLive(async (token) => {
      const raw = input as unknown as Partial<Record<string, unknown>> | null | undefined;
      if (typeof raw !== "object" || raw === null) throw new Error("Incident invalide");
      requireText(raw.title, "Titre");
      requireText(raw.serviceName, "Service");
      requireText(raw.description, "Description");
      const body = {
        serviceName: input.serviceName.trim(), severity: input.severity, title: input.title.trim(), impactScope: input.impactScope,
        affectedCompanyId: input.impactScope === "SINGLE_COMPANY" ? input.affectedCompanyId : null,
        description: input.description.trim() || null, detectedAt: new Date().toISOString(),
      };
      await apiCall("/incidents", { method: "POST", body, token });
      revalidatePath("/supervision");
      revalidatePath("/supervision/incidents");
    });
  }
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
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(incidentId, "Incident");
    refreshIncident(incidentsRepo.advance(incidentId, target, actor));
  });
}

export async function setIncidentPostmortem(incidentId: string, url: string): Promise<ActionResult> {
  const inert = await notWiredInLive();
  if (inert) return inert;
  return run((actor) => {
    requireString(incidentId, "Incident");
    requireText(url, "URL");
    refreshIncident(incidentsRepo.setPostmortem(incidentId, url, actor));
  });
}
