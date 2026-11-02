"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  completeDataSubjectRequest, rejectDataSubjectRequest, startDataSubjectRequest,
} from "@/app/(admin)/conformite/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. `status` is the request's current status. */
export interface DsrActionsProps { requestId: string; status: "RECEIVED" | "IN_PROGRESS" }

export function DsrActions({ requestId, status }: DsrActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"start" | "complete" | "reject" | null>(null);
  const close = (o: boolean) => { if (!o) setOpen(null); };

  return (
    <>
      {status === "RECEIVED" && <Button size="sm" onClick={() => setOpen("start")}>Prendre en charge</Button>}
      <Button size="sm" variant="secondary" onClick={() => setOpen("complete")}>Clôturer la demande</Button>
      <Button size="sm" variant="danger" onClick={() => setOpen("reject")}>Rejeter la demande</Button>

      <ConfirmDialog
        open={open === "start"} onOpenChange={close}
        title="Prendre en charge la demande"
        description="La demande passe à « En cours » et vous en devenez le responsable. Le délai légal continue de courir."
        confirmLabel="Confirmer la prise en charge"
        onConfirm={async () => {
          const r = await startDataSubjectRequest(requestId);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
      <ConfirmDialog
        open={open === "complete"} onOpenChange={close}
        title="Clôturer la demande"
        description="Décrivez ce qui a été fait. La demande est close et ne peut plus être modifiée."
        confirmLabel="Confirmer la clôture" requireReason
        onConfirm={async (notes) => {
          const r = await completeDataSubjectRequest(requestId, notes);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
      <ConfirmDialog
        open={open === "reject"} onOpenChange={close}
        title="Rejeter la demande"
        description="Indiquez pourquoi la demande est rejetée. Le demandeur en est informé par la compagnie ou par la plateforme."
        confirmLabel="Confirmer le rejet" destructive requireReason
        onConfirm={async (notes) => {
          const r = await rejectDataSubjectRequest(requestId, notes);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
