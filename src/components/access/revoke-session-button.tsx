"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { revokeSession } from "@/app/(admin)/acces/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** `label` names the session (username and device) in the button and the dialog. */
export interface RevokeSessionButtonProps { sessionId: string; label: string }

export function RevokeSessionButton({ sessionId, label }: RevokeSessionButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button size="sm" variant="danger" onClick={() => setOpen(true)} aria-label={`Révoquer la session ${label}`}>
        Révoquer
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Révoquer la session ${label}`}
        description="La session est fermée immédiatement : l'utilisateur devra se reconnecter sur cet appareil."
        confirmLabel="Révoquer la session" destructive requireReason
        onConfirm={async (reason) => {
          const r = await revokeSession(sessionId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
