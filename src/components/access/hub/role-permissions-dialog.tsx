"use client";

import { ListChecks } from "@phosphor-icons/react/dist/ssr";
import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

export interface RolePermissionGroup { domain: string; items: { code: string; description: string }[] }

export function RolePermissionsDialog({ name, groups, total }: { name: string; groups: RolePermissionGroup[]; total: number }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} disabled={total === 0}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium hover:bg-muted disabled:pointer-events-none disabled:opacity-40">
        <ListChecks size={16} weight="duotone" aria-hidden /> Voir les permissions
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <DialogTitle>Permissions · {name}</DialogTitle>
          <DialogDescription>{total} permission(s) accordée(s) à ce rôle.</DialogDescription>
          <div className="mt-4 space-y-5">
            {groups.map((g) => (
              <section key={g.domain}>
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{g.domain}</h3>
                <ul className="space-y-2">
                  {g.items.map((p) => (
                    <li key={p.code} className="rounded-xl bg-muted/60 px-3 py-2">
                      <p className="font-mono text-xs font-semibold">{p.code}</p>
                      <p className="text-sm text-muted-foreground">{p.description}</p>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
