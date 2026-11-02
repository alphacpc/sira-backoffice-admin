"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ignoreFeedback } from "@/app/(admin)/clients/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Scalars only. */
export interface IgnoreFeedbackButtonProps { feedbackId: string; title: string }

export function IgnoreFeedbackButton({ feedbackId, title }: IgnoreFeedbackButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="danger" size="sm" onClick={() => setOpen(true)}>Ignorer l&apos;avis</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Ignorer l'avis « ${title} »`}
        description="Un avis ignoré n'est plus traité par la compagnie. Seuls les avis en attente ou examinés peuvent être ignorés."
        confirmLabel="Ignorer cet avis" destructive requireReason
        onConfirm={async (reason) => {
          const r = await ignoreFeedback(feedbackId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
