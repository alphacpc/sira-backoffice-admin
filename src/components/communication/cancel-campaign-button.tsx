"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cancelCampaign } from "@/app/(admin)/communication/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. */
export interface CancelCampaignButtonProps { campaignId: string; name: string }

export function CancelCampaignButton({ campaignId, name }: CancelCampaignButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Annuler la campagne</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Annuler la campagne « ${name} »`}
        description="Les programmations en attente de la campagne sont annulées avec elle. Une campagne en cours ou terminée ne peut pas être annulée."
        confirmLabel="Confirmer l'annulation" destructive requireReason
        onConfirm={async (reason) => {
          const r = await cancelCampaign(campaignId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
