"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelSubscription } from "@/app/(admin)/facturation/actions";
import { RetryPaymentButton } from "@/components/billing/retry-payment-button";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only; the flags come from `canRetry`/`canCancel` computed on the server. */
export interface SubscriptionActionsProps {
  subscriptionId: string;
  companyName: string;
  canRetry: boolean;
  canCancel: boolean;
}

export function SubscriptionActions({ subscriptionId, companyName, canRetry, canCancel }: SubscriptionActionsProps) {
  const router = useRouter();
  const [canceling, setCanceling] = useState(false);
  if (!canRetry && !canCancel) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {canRetry && <RetryPaymentButton subscriptionId={subscriptionId} label={companyName} />}
      {canCancel && (
        <Button size="sm" variant="danger" onClick={() => setCanceling(true)}>Annuler l&apos;abonnement</Button>
      )}
      <ConfirmDialog
        open={canceling} onOpenChange={setCanceling}
        title={`Annuler l'abonnement de ${companyName}`}
        description="L'abonnement passe à l'état « Annulée ». Le motif est enregistré dans l'activité de la compagnie."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelSubscription(subscriptionId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </div>
  );
}
