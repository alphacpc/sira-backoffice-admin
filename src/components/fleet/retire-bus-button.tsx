"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { retireBus } from "@/app/(admin)/flotte/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only: the bus id and its plate (shown in the dialog title). */
export interface RetireBusButtonProps { busId: string; plate: string }

export function RetireBusButton({ busId, plate }: RetireBusButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)}>Mettre hors service</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Mettre le bus ${plate} hors service`}
        description="Le bus ne pourra plus être affecté à un trajet. Refusé si une maintenance est en cours ou si des trajets sont à venir."
        confirmLabel="Mettre hors service" destructive requireReason
        onConfirm={async (reason) => {
          const r = await retireBus(busId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
