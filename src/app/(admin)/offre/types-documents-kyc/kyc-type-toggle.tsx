"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setKycTypeActive } from "@/app/(admin)/offre/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";

/** Three scalars only: nothing else crosses the server/client boundary. */
export interface KycTypeToggleProps { code: string; name: string; active: boolean }

export function KycTypeToggle({ code, name, active }: KycTypeToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const verb = active ? "Désactiver" : "Réactiver";

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => setOpen(true)} aria-label={`${verb} ${name}`}>
        {verb}
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`${verb} le type « ${name} »`}
        description={active
          ? "Ce document ne sera plus exigé pour activer une compagnie. Les documents déjà déposés sont conservés."
          : "Ce document sera de nouveau exigé pour activer une compagnie."}
        confirmLabel={verb} destructive={active} requireReason
        onConfirm={async (reason) => {
          const r = await setKycTypeActive(code, !active, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </>
  );
}
