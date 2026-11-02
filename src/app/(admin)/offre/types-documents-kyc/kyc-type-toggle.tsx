"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setKycTypeActive } from "@/app/(admin)/offre/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { cn } from "@/lib/utils";

/** Three scalars only: nothing else crosses the server/client boundary. */
export interface KycTypeToggleProps { code: string; name: string; active: boolean }

/** On/off switch; changing it asks for a reason first. */
export function KycTypeToggle({ code, name, active }: KycTypeToggleProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const verb = active ? "Désactiver" : "Réactiver";

  return (
    <>
      <button
        type="button" role="switch" aria-checked={active} aria-label={`${verb} ${name}`} title={verb}
        onClick={() => setOpen(true)}
        className={cn(
          "relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
          active ? "bg-lime-500" : "bg-muted-foreground/30",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform", active ? "translate-x-6" : "translate-x-1")} />
      </button>
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
