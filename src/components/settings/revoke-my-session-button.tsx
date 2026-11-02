"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeMySession } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** `label` names the device in the button and the dialog. */
export interface RevokeMySessionButtonProps { sessionId: string; label: string }

export function RevokeMySessionButton({ sessionId, label }: RevokeMySessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size="sm" variant="danger" aria-label={`Révoquer la session ${label}`} onClick={() => setOpen(true)}>Révoquer</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen} destructive
        title={`Révoquer la session ${label}`}
        description="La session est fermée immédiatement sur cet appareil."
        confirmLabel="Révoquer la session"
        onConfirm={async () => {
          const r = await revokeMySession(sessionId);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
