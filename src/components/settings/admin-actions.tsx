"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { reactivateAdmin, resetAdminTotp, revokeAdminSessions, suspendAdmin } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { AdminStatus } from "@/lib/types";

/** Scalars only: no session, no address. The buttons are hidden for the signed-in administrator's own row. */
export interface AdminActionsProps {
  adminId: string; identifier: string; status: AdminStatus; totpEnabled: boolean; activeSessions: number; isSelf: boolean;
}

type Dialog = "suspend" | "reactivate" | "totp" | "sessions" | null;

export function AdminActions({ adminId, identifier, status, totpEnabled, activeSessions, isSelf }: AdminActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<Dialog>(null);
  const close = (o: boolean) => { if (!o) setOpen(null); };
  const run = (action: (id: string, reason: string) => Promise<{ ok: true } | { ok: false; error: string }>) => async (reason: string) => {
    const r = await action(adminId, reason);
    router.refresh();
    if (!r.ok) throw new Error(r.error);
  };
  if (isSelf) return <span className="text-xs text-muted-foreground">Toi</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {status === "active" && <Button size="sm" variant="danger" aria-label={`Suspendre ${identifier}`} onClick={() => setOpen("suspend")}>Suspendre</Button>}
      {status === "suspended" && <Button size="sm" aria-label={`Réactiver ${identifier}`} onClick={() => setOpen("reactivate")}>Réactiver</Button>}
      {status === "active" && totpEnabled && (
        <Button size="sm" variant="secondary" aria-label={`Réinitialiser le TOTP de ${identifier}`} onClick={() => setOpen("totp")}>Réinitialiser le TOTP</Button>
      )}
      {activeSessions > 0 && (
        <Button size="sm" variant="secondary" aria-label={`Révoquer les sessions de ${identifier}`} onClick={() => setOpen("sessions")}>Révoquer les sessions</Button>
      )}

      <ConfirmDialog
        open={open === "suspend"} onOpenChange={close} requireReason destructive
        title={`Suspendre ${identifier}`}
        description="Le compte est suspendu et toutes ses sessions actives sont révoquées immédiatement."
        confirmLabel="Suspendre le compte" onConfirm={run(suspendAdmin)}
      />
      <ConfirmDialog
        open={open === "reactivate"} onOpenChange={close} requireReason
        title={`Réactiver ${identifier}`}
        description="Le compte redevient actif. Ses anciennes sessions ne sont pas rétablies : il devra se reconnecter."
        confirmLabel="Réactiver le compte" onConfirm={run(reactivateAdmin)}
      />
      <ConfirmDialog
        open={open === "totp"} onOpenChange={close} requireReason destructive
        title={`Réinitialiser le TOTP de ${identifier}`}
        description="Son TOTP et ses codes de récupération sont supprimés, ses sessions sont révoquées : il devra se ré-enrôler à la prochaine connexion."
        confirmLabel="Réinitialiser le TOTP" onConfirm={run(resetAdminTotp)}
      />
      <ConfirmDialog
        open={open === "sessions"} onOpenChange={close} requireReason destructive
        title={`Révoquer les sessions de ${identifier}`}
        description="Toutes ses sessions actives sont fermées immédiatement ; le compte reste actif."
        confirmLabel="Révoquer les sessions" onConfirm={run(revokeAdminSessions)}
      />
    </div>
  );
}
