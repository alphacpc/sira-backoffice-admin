"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { regenerateMyRecoveryCodes, revokeMyOtherSessions, updateMyDisplayName } from "@/app/(admin)/parametres/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/** Scalars only. */
export interface ProfileActionsProps { displayName: string; totpEnabled: boolean; otherActiveSessions: number }

export function ProfileActions({ displayName, totpEnabled, otherActiveSessions }: ProfileActionsProps) {
  const router = useRouter();
  const [open, setOpen] = useState<"name" | "codes" | "others" | null>(null);
  const [name, setName] = useState(displayName);
  const [codes, setCodes] = useState<string[] | null>(null);
  const close = (o: boolean) => { if (!o) setOpen(null); };

  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" onClick={() => { setName(displayName); setOpen("name"); }}>Modifier mon nom</Button>
      {totpEnabled && <Button variant="secondary" onClick={() => setOpen("codes")}>Régénérer mes codes de récupération</Button>}
      {otherActiveSessions > 0 && <Button variant="danger" onClick={() => setOpen("others")}>Révoquer toutes les autres sessions</Button>}

      <ConfirmDialog
        open={open === "name"} onOpenChange={close}
        title="Modifier mon nom" confirmLabel="Enregistrer le nom" confirmDisabled={name.trim() === ""}
        onConfirm={async () => {
          const r = await updateMyDisplayName(name);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block space-y-1 text-sm"><span className="font-medium">Nom affiché</span>
          <Input aria-label="Nom affiché" value={name} onChange={(e) => setName(e.target.value)} />
        </label>
      </ConfirmDialog>

      <ConfirmDialog
        open={open === "codes"} onOpenChange={close} destructive
        title="Régénérer mes codes de récupération"
        description="Les anciens codes ne fonctionnent plus. Les nouveaux ne sont affichés qu'une seule fois : note-les maintenant."
        confirmLabel="Régénérer les codes"
        onConfirm={async () => {
          const r = await regenerateMyRecoveryCodes();
          router.refresh();
          if (!r.ok) throw new Error(r.error);
          setCodes(r.value);
        }}
      />

      <ConfirmDialog
        open={open === "others"} onOpenChange={close} destructive
        title="Révoquer toutes les autres sessions"
        description="Toutes tes sessions actives, sauf celle-ci, sont fermées immédiatement."
        confirmLabel="Révoquer les sessions"
        onConfirm={async () => {
          const r = await revokeMyOtherSessions();
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      />

      <Dialog open={codes !== null} onOpenChange={(o) => { if (!o) setCodes(null); }}>
        <DialogContent
          onEscapeKeyDown={(e) => e.preventDefault()}
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
        >
          <DialogTitle>Nouveaux codes de récupération</DialogTitle>
          <DialogDescription>Chaque code ne sert qu&apos;une fois. Ils ne seront plus affichés après la fermeture de cette fenêtre.</DialogDescription>
          <ul className="mt-4 grid grid-cols-2 gap-2 font-mono text-sm">
            {(codes ?? []).map((c) => <li key={c} data-testid="recovery-code" className="rounded border border-border px-2 py-1">{c}</li>)}
          </ul>
          <div className="mt-5 flex justify-end"><Button onClick={() => setCodes(null)}>J&apos;ai noté mes codes</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
