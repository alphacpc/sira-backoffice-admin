"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { declareIncident } from "@/app/(admin)/supervision/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const SEVERITIES = [["LOW", "Faible"], ["MEDIUM", "Moyenne"], ["HIGH", "Haute"], ["CRITICAL", "Critique"]] as const;
const SCOPES = [
  ["SINGLE_COMPANY", "Une compagnie"], ["MULTI_COMPANY", "Plusieurs compagnies"], ["PLATFORM_WIDE", "Toute la plateforme"],
] as const;
const FIELD = "w-full rounded-lg border border-border bg-card px-3 py-2 text-sm";

/** Service names and company names/ids only: no incident data comes in. */
export function DeclareIncidentButton({
  services, companies,
}: { services: string[]; companies: { id: string; name: string }[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [serviceName, setServiceName] = useState(services[0] ?? "");
  const [severity, setSeverity] = useState<(typeof SEVERITIES)[number][0]>("MEDIUM");
  const [scope, setScope] = useState<(typeof SCOPES)[number][0]>("PLATFORM_WIDE");
  const [companyId, setCompanyId] = useState("");
  const [description, setDescription] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Déclarer un incident</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title="Déclarer un incident"
        description="L'incident est créé « en investigation », détecté maintenant, à votre nom."
        confirmLabel="Déclarer l'incident" confirmDisabled={title.trim() === ""}
        onConfirm={async () => {
          const r = await declareIncident({
            title, serviceName, severity, impactScope: scope,
            affectedCompanyId: scope === "SINGLE_COMPANY" && companyId ? companyId : null, description,
          });
          router.refresh();
          if (!r.ok) throw new Error(r.error);
          setTitle("");
          setDescription("");
        }}
      >
        <div className="space-y-3 text-sm">
          <label className="block space-y-1"><span className="font-medium">Titre</span>
            <Input aria-label="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="block space-y-1"><span className="font-medium">Service</span>
            <select aria-label="Service" className={FIELD} value={serviceName} onChange={(e) => setServiceName(e.target.value)}>
              {services.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="font-medium">Gravité</span>
            <select aria-label="Gravité" className={FIELD} value={severity} onChange={(e) => setSeverity(e.target.value as typeof severity)}>
              {SEVERITIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="block space-y-1"><span className="font-medium">Portée</span>
            <select aria-label="Portée" className={FIELD} value={scope} onChange={(e) => setScope(e.target.value as typeof scope)}>
              {SCOPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          {scope === "SINGLE_COMPANY" && (
            <label className="block space-y-1"><span className="font-medium">Compagnie touchée</span>
              <select aria-label="Compagnie touchée" className={FIELD} value={companyId} onChange={(e) => setCompanyId(e.target.value)}>
                <option value="">Choisir une compagnie…</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <label className="block space-y-1"><span className="font-medium">Description</span>
            <textarea aria-label="Description" rows={3} className={FIELD} value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
