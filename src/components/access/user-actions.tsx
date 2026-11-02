"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { changeUserRole, revokeUserSessions } from "@/app/(admin)/utilisateurs/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import type { RoleOption } from "@/lib/repos/access";

/** Scalars and role options only: no contact data reaches this component. */
export interface UserActionsProps {
  userId: string;
  displayName: string;
  roleCode: string;
  roles: RoleOption[];
  activeSessions: number;
}

export function UserActions({ userId, displayName, roleCode, roles, activeSessions }: UserActionsProps) {
  const router = useRouter();
  const [changing, setChanging] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [nextRole, setNextRole] = useState("");

  function openRoleDialog() {
    setNextRole("");
    setChanging(true);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="secondary" onClick={openRoleDialog}>Changer le rôle</Button>
      {activeSessions > 0 && (
        <Button size="sm" variant="danger" onClick={() => setRevoking(true)}>Révoquer toutes les sessions</Button>
      )}
      <ConfirmDialog
        open={changing} onOpenChange={setChanging}
        title={`Changer le rôle de ${displayName}`}
        description="Toutes les sessions actives du compte sont révoquées immédiatement : une nouvelle connexion sera nécessaire."
        confirmLabel="Changer le rôle" requireReason confirmDisabled={nextRole === ""}
        onConfirm={async (reason) => {
          const r = await changeUserRole(userId, nextRole, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label htmlFor="next-role" className="text-sm font-medium">Nouveau rôle</label>
        <select
          id="next-role" value={nextRole} onChange={(e) => setNextRole(e.target.value)}
          className="w-full rounded-lg border border-border bg-card p-2 text-sm focus-visible:outline-2 focus-visible:outline-accent"
        >
          <option value="">Choisir un rôle…</option>
          {roles.filter((r) => r.code !== roleCode).map((r) => (
            <option key={r.code} value={r.code}>{r.name}</option>
          ))}
        </select>
      </ConfirmDialog>
      <ConfirmDialog
        open={revoking} onOpenChange={setRevoking}
        title={`Révoquer les sessions de ${displayName}`}
        description={`${activeSessions} session(s) active(s) seront révoquées : l'utilisateur devra se reconnecter.`}
        confirmLabel="Révoquer les sessions" destructive requireReason
        onConfirm={async (reason) => {
          const r = await revokeUserSessions(userId, reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />
    </div>
  );
}
