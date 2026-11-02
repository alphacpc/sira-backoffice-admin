"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelBooking } from "@/app/(admin)/ventes/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only: the booking code labels the button and the dialog. */
export interface CancelBookingButtonProps { bookingId: string; bookingCode: string }

export function CancelBookingButton({ bookingId, bookingCode }: CancelBookingButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Annuler la réservation</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Annuler la réservation ${bookingCode}`}
        description="Le siège est rendu au trajet. Une réservation payée ou dont le paiement est en cours ne peut pas être annulée."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelBooking(bookingId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
