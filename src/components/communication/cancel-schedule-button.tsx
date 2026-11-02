"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelSchedule } from "@/app/(admin)/communication/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only: the subject labels the button and the dialog. */
export interface CancelScheduleButtonProps { scheduleId: string; subject: string }

export function CancelScheduleButton({ scheduleId, subject }: CancelScheduleButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)} aria-label={`Annuler la programmation « ${subject} »`}>
        Annuler
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Annuler la programmation « ${subject} »`}
        description="Seule une programmation en attente peut être annulée. Cette décision est définitive."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelSchedule(scheduleId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
