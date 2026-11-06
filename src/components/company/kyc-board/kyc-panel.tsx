"use client";

import { ArrowSquareOut, CheckCircle, Clock, FileArrowUp, Hourglass, WarningCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { KycActions } from "@/components/company/kyc-actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { KycCard } from "@/lib/repos/companies";
import type { KycStage } from "@/lib/types";
import { DOC_LABEL, STAGE_META } from "./stages";

const DOC_ICON = {
  approved: <CheckCircle size={20} weight="fill" className="text-lime-600" aria-hidden />,
  pending: <Clock size={20} weight="duotone" className="text-amber-500" aria-hidden />,
  rejected: <XCircle size={20} weight="fill" className="text-rose-500" aria-hidden />,
  missing: <WarningCircle size={20} weight="duotone" className="text-muted-foreground" aria-hidden />,
} as const;

export function KycPanel({
  card, onClose, onMove,
}: { card: KycCard | null; onClose: () => void; onMove: (card: KycCard, stage: KycStage) => void }) {
  const meta = card ? STAGE_META[card.stage] : null;
  const canMove = card && card.stage !== "approved";
  return (
    <Dialog open={!!card} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="left-auto right-0 top-0 h-full max-w-md translate-x-0 translate-y-0 overflow-y-auto rounded-none rounded-l-2xl p-0">
        {card && meta && (
          <>
            <div className="border-b border-border p-6">
              <div className="flex items-center gap-3">
                <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-[#ea580c] text-base font-bold text-white">
                  {card.name.trim().slice(0, 2).toUpperCase()}
                </span>
                <div className="min-w-0">
                  <DialogTitle>{card.name}</DialogTitle>
                  <DialogDescription>{card.ownerName ?? "Propriétaire inconnu"}</DialogDescription>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${meta.badge}`}>
                  <meta.icon size={14} weight="fill" aria-hidden /> {meta.label}
                </span>
                <Link href={`/compagnies/${card.companyId}?onglet=kyc`} className="inline-flex items-center gap-1 text-sm font-medium text-accent-text hover:underline">
                  Fiche compagnie <ArrowSquareOut size={14} aria-hidden />
                </Link>
              </div>
              {card.note && <p className="mt-3 rounded-lg bg-muted p-3 text-sm text-muted-foreground">{card.note}</p>}
            </div>

            <div className="p-6">
              <h4 className="text-sm font-semibold">Documents · {card.docsApproved} / {card.docsRequired} approuvés</h4>
              <ul className="mt-3 divide-y divide-border rounded-xl border border-border">
                {card.docs.map((d) => (
                  <li key={d.typeName} className="flex items-center gap-3 p-3">
                    {DOC_ICON[d.status]}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{d.typeName}</p>
                      <p className="text-xs text-muted-foreground">{DOC_LABEL[d.status]}</p>
                    </div>
                    {d.status === "pending" && d.id && <KycActions docId={d.id} companyId={card.companyId} docLabel={`${d.typeName} de ${card.name}`} />}
                  </li>
                ))}
              </ul>

              {canMove && (
                <div className="mt-6 space-y-2">
                  <h4 className="text-sm font-semibold">Faire avancer le dossier</h4>
                  <div className="flex flex-wrap gap-2">
                    {card.stage !== "in_review" && (
                      <Button variant="secondary" size="sm" onClick={() => onMove(card, "in_review")}>
                        <Hourglass size={16} aria-hidden /> Passer en cours
                      </Button>
                    )}
                    {card.stage !== "needs_info" && (
                      <Button variant="secondary" size="sm" onClick={() => onMove(card, "needs_info")}>
                        <FileArrowUp size={16} aria-hidden /> Demander un complément
                      </Button>
                    )}
                    {card.stage !== "rejected" && (
                      <Button variant="danger" size="sm" onClick={() => onMove(card, "rejected")}>
                        <XCircle size={16} aria-hidden /> Rejeter le dossier
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">La validation se fait en approuvant tous les documents.</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
