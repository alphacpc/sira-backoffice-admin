"use client";

import { ArrowsClockwise } from "@phosphor-icons/react/dist/ssr";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { retrySubscriptionPayment } from "@/app/(admin)/facturation/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** `label` is the company name shown in the button and the dialog; no other data is needed. */
export interface RetryPaymentButtonProps { subscriptionId: string; label: string; className?: string }

export function RetryPaymentButton({ subscriptionId, label, className }: RetryPaymentButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" className={className} onClick={() => setOpen(true)} aria-label={`Relancer le paiement de ${label}`}>
        <ArrowsClockwise size={16} weight="bold" aria-hidden /> Relancer le paiement
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Relancer le paiement de ${label}`}
        description="Une nouvelle tentative de prélèvement est simulée immédiatement. En cas de succès, une facture payée est émise et l'abonnement redevient actif."
        confirmLabel="Relancer"
        onConfirm={async () => {
          const r = await retrySubscriptionPayment(subscriptionId);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
