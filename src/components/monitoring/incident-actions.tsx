"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { advanceIncident, setIncidentPostmortem } from "@/app/(admin)/supervision/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { IncidentStatus } from "@/lib/types";

const STATUSES: [IncidentStatus, string][] = [
  ["INVESTIGATING", "En investigation"], ["IDENTIFIED", "Identifié"], ["MONITORING", "Sous surveillance"], ["RESOLVED", "Résolu"],
];

/** Scalars only: the incident id, its status and its postmortem address. */
export interface IncidentActionsProps { incidentId: string; status: IncidentStatus; postmortemUrl: string | null }

export function IncidentActions({ incidentId, status, postmortemUrl }: IncidentActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"status" | "postmortem" | null>(null);
  const options = STATUSES.filter(([v]) => v !== status);
  const [target, setTarget] = useState<IncidentStatus>(options[0]?.[0] ?? "RESOLVED");
  const [url, setUrl] = useState(postmortemUrl ?? "");
  const close = (o: boolean) => { if (!o) setOpen(null); };

  return (
    <>
      {status !== "RESOLVED" && <Button size="sm" onClick={() => { setTarget(options[0]![0]); setOpen("status"); }}>Changer le statut</Button>}
      <Button size="sm" variant="secondary" onClick={() => { setUrl(postmortemUrl ?? ""); setOpen("postmortem"); }}>
        {postmortemUrl ? "Modifier le postmortem" : "Renseigner le postmortem"}
      </Button>

      <ConfirmDialog
        open={open === "status"} onOpenChange={close}
        title="Changer le statut de l'incident"
        description="Un incident ne peut qu'avancer : investigation, identifié, sous surveillance, résolu. Les sauts sont permis ; une résolution est définitive."
        confirmLabel="Confirmer le changement"
        onConfirm={async () => {
          const r = await advanceIncident(incidentId, target);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block space-y-1 text-sm"><span className="font-medium">Nouveau statut</span>
          <select
            aria-label="Nouveau statut" value={target} onChange={(e) => setTarget(e.target.value as IncidentStatus)}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm"
          >
            {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "postmortem"} onOpenChange={close}
        title="Postmortem de l'incident"
        description="Adresse d'un compte rendu publié (http ou https). Elle peut être renseignée à tout moment, même après la résolution."
        confirmLabel="Enregistrer le postmortem" confirmDisabled={url.trim() === ""}
        onConfirm={async () => {
          const r = await setIncidentPostmortem(incidentId, url);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block space-y-1 text-sm"><span className="font-medium">Adresse du postmortem</span>
          <Input aria-label="Adresse du postmortem" value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
      </ConfirmDialog>
    </>
  );
}
