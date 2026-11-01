"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { forceActivateCompany } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { StatusBadge } from "@/components/data/status-badge";
import { KycActions } from "@/components/company/kyc-actions";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { kycStatusBadge } from "@/lib/labels";
import type { Company, KycDocument } from "@/lib/types";
import { KYC_TYPES } from "@/lib/types/kyc";

export function KycPanel({ company, documents }: { company: Company; documents: KycDocument[] }) {
  const router = useRouter();
  const [forcing, setForcing] = useState(false);
  const approved = KYC_TYPES.filter((t) =>
    documents.some((d) => d.typeCode === t.code && d.status === "approved"),
  ).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm">
          <span className="font-medium">{approved} / {KYC_TYPES.length}</span> documents obligatoires approuvés.
          {company.forceActivated && (
            <span className="ml-2"><StatusBadge tone="warning">Activée de force</StatusBadge></span>
          )}
        </p>
        {company.status === "draft" && (
          <Button variant="secondary" onClick={() => setForcing(true)}>Forcer l&apos;activation</Button>
        )}
      </div>

      <div className="overflow-x-auto rounded-card border border-border bg-card shadow-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 font-medium">Document</th>
              <th className="px-3 py-2 font-medium">Statut</th>
              <th className="px-3 py-2 font-medium">Déposé le</th>
              <th className="px-3 py-2 font-medium">Détail</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {KYC_TYPES.map((t) => {
              const doc = documents.find((d) => d.typeCode === t.code);
              const badge = doc ? kycStatusBadge(doc.status) : null;
              return (
                <tr key={t.code} className="border-b border-border last:border-0">
                  <td className="px-3 py-2 font-medium">{t.name}</td>
                  <td className="px-3 py-2">
                    {badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : <StatusBadge>Non déposé</StatusBadge>}
                  </td>
                  <td className="px-3 py-2">{doc ? formatDate(doc.uploadedAt) : "—"}</td>
                  <td className="px-3 py-2 text-muted-foreground">{doc?.rejectionReason ?? ""}</td>
                  <td className="px-3 py-2">
                    {doc?.status === "pending" && <KycActions docId={doc.id} docLabel={t.name} />}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ConfirmDialog
        open={forcing} onOpenChange={setForcing}
        title={`Forcer l'activation de ${company.name}`}
        description="La compagnie sera activée sans KYC complet. Cette action est tracée et marquée « activée de force »."
        confirmLabel="Forcer l'activation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await forceActivateCompany(company.id, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </div>
  );
}
