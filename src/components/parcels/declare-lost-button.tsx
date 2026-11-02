"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { declareParcelLost } from "@/app/(admin)/colis/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. */
export interface DeclareLostButtonProps { parcelId: string; parcelCode: string }

export function DeclareLostButton({ parcelId, parcelCode }: DeclareLostButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Déclarer le colis perdu</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Déclarer le colis ${parcelCode} perdu`}
        description="Seul un colis en transit ou au hub peut être déclaré perdu. Cette décision est définitive et figure dans l'historique du colis."
        confirmLabel="Confirmer la perte" destructive requireReason
        onConfirm={async (reason) => {
          const r = await declareParcelLost(parcelId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
