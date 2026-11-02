"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { inviteAdmin } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function InviteAdminButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [identifier, setIdentifier] = useState("");
  const [displayName, setDisplayName] = useState("");

  return (
    <>
      <Button onClick={() => setOpen(true)}>Inviter un administrateur</Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title="Inviter un administrateur"
        description="Le compte est créé « invité » : il devra enrôler son TOTP à sa première connexion. Aucun e-mail n'est envoyé dans cette maquette."
        confirmLabel="Envoyer l'invitation" confirmDisabled={identifier.trim() === "" || displayName.trim() === ""}
        onConfirm={async () => {
          const r = await inviteAdmin({ identifier, displayName });
          router.refresh();
          if (!r.ok) throw new Error(r.error);
          setIdentifier("");
          setDisplayName("");
        }}
      >
        <div className="space-y-3 text-sm">
          <label className="block space-y-1"><span className="font-medium">Identifiant de connexion</span>
            <Input aria-label="Identifiant de connexion" placeholder="prenom.nom@sira.app" value={identifier} onChange={(e) => setIdentifier(e.target.value)} />
          </label>
          <label className="block space-y-1"><span className="font-medium">Nom affiché</span>
            <Input aria-label="Nom affiché" value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
          </label>
        </div>
      </ConfirmDialog>
    </>
  );
}
