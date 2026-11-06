"use client";

import { CheckCircle, Eye, FileDashed, ShieldCheck, XCircle } from "@phosphor-icons/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { forceActivateCompany } from "@/app/(admin)/compagnies/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { StatusBadge } from "@/components/data/status-badge";
import { KycActions } from "@/components/company/kyc-actions";
import { ReplaceFile } from "@/components/company/replace-file";
import { KycPreview, sampleFile, type KycFile } from "@/components/company/kyc-preview";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/format";
import { kycStatusBadge } from "@/lib/labels";
import type { Company, KycDocument, KycDocumentType } from "@/lib/types";

/** Only the fields the panel needs: this is a client component, so nothing personal may cross the boundary. */
export type KycPanelCompany = Pick<Company, "id" | "name" | "status" | "forceActivated">;

export function KycPanel({
  company, documents, kycTypes, canReplace = false,
}: { company: KycPanelCompany; documents: KycDocument[]; kycTypes: KycDocumentType[]; canReplace?: boolean }) {
  const router = useRouter();
  const [forcing, setForcing] = useState(false);
  const [preview, setPreview] = useState<{ file: KycFile; title: string; subtitle: string } | null>(null);
  const required = kycTypes.filter((t) => t.active && t.required);
  const approved = required.filter((t) =>
    documents.some((d) => d.typeCode === t.code && d.status === "approved"),
  ).length;

  const pct = required.length ? Math.round((approved / required.length) * 100) : 0;
  const complete = required.length > 0 && approved === required.length;

  return (
    <div className="space-y-5">
      <div className="rounded-card border border-border bg-card p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <ShieldCheck size={32} weight="duotone" aria-hidden className="text-orange-500" />
            <div>
              <p className="text-base font-semibold">{approved} / {required.length} documents obligatoires approuvés</p>
              <p className="text-sm text-muted-foreground">{complete ? "Dossier complet" : "Dossier en cours de vérification"}</p>
            </div>
            {company.forceActivated && <StatusBadge tone="warning">Activée de force</StatusBadge>}
          </div>
          {company.status === "draft" && (
            <Button variant="secondary" onClick={() => setForcing(true)}>Forcer l&apos;activation</Button>
          )}
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avancement du KYC">
          <div className="h-full rounded-full bg-orange-500" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <ul className="grid gap-4 md:grid-cols-2">
        {kycTypes.map((t, i) => {
          const doc = documents.find((d) => d.typeCode === t.code);
          const badge = doc ? kycStatusBadge(doc.status) : null;
          const isRequired = t.active && t.required;
          const file = sampleFile(i, t.name);
          return (
            <li key={t.code} className="flex flex-col gap-4 rounded-card border border-border bg-card p-5 shadow-card">
              <div className="flex items-start gap-3">
                {doc ? (
                  <button type="button" aria-label={`Aperçu de ${t.name}`} onClick={() => setPreview({ file, title: t.name, subtitle: `Déposé le ${formatDate(doc.uploadedAt)}` })}
                    className="group relative h-28 w-24 shrink-0 overflow-hidden rounded-lg border border-border bg-muted/50 shadow-sm transition hover:border-orange-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-orange-500">
                    {file.kind === "pdf" ? (
                      <iframe src={`${file.url}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} title="" tabIndex={-1} aria-hidden className="pointer-events-none h-full w-full" />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={file.url} alt="" className="h-full w-full object-cover" />
                    )}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition group-hover:bg-black/35 group-hover:opacity-100"><Eye size={24} weight="bold" aria-hidden className="text-white" /></span>
                  </button>
                ) : (
                  <span aria-hidden className="flex h-28 w-24 shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground"><FileDashed size={28} /></span>
                )}
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">{t.name}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {doc ? `Déposé le ${formatDate(doc.uploadedAt)} · ${doc.replacedFileName ?? (file.kind === "pdf" ? "PDF" : "Image")}` : "Aucun fichier déposé"}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1.5">
                  {badge ? <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge> : <StatusBadge>Non déposé</StatusBadge>}
                  {!isRequired && <StatusBadge>Non exigé</StatusBadge>}
                </div>
              </div>
              {doc && doc.status !== "pending" && (
                <p className="flex items-center gap-2 text-xs text-muted-foreground">
                  {doc.status === "approved" ? <CheckCircle size={16} weight="fill" aria-hidden className="text-lime-600" /> : <XCircle size={16} weight="fill" aria-hidden className="text-rose-500" />}
                  <span>{doc.status === "approved" ? "Validé" : "Rejeté"} par <b className="font-semibold text-foreground">{doc.reviewedBy ?? "—"}</b>{doc.reviewedAt ? ` · ${formatDate(doc.reviewedAt)}` : ""}</span>
                </p>
              )}
              {doc?.rejectionReason && (
                <p className="rounded-lg bg-danger/10 px-3 py-2 text-xs text-danger">Motif du rejet : {doc.rejectionReason}</p>
              )}
              {doc && (canReplace || doc.status === "pending") && (
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
                  {canReplace ? <ReplaceFile docId={doc.id} docLabel={t.name} /> : <span />}
                  {doc.status === "pending" && <KycActions docId={doc.id} companyId={company.id} docLabel={t.name} />}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      <KycPreview file={preview?.file ?? null} title={preview?.title ?? ""} subtitle={preview?.subtitle ?? ""} onClose={() => setPreview(null)} />

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
