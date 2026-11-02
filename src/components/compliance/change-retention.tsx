"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCompanyRetention } from "@/app/(admin)/conformite/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RetentionRow } from "@/lib/repos/compliance";

export function ChangeRetention({ row }: { row: RetentionRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [days, setDays] = useState(String(row.effectiveDays));

  return (
    <>
      <Button size="sm" variant="secondary" onClick={() => { setDays(String(row.effectiveDays)); setOpen(true); }} aria-label={`Modifier la durée de ${row.companyName}`}>
        Modifier
      </Button>
      <ConfirmDialog
        open={open} onOpenChange={setOpen}
        title={`Modifier la durée de rétention de ${row.companyName}`}
        description="Raccourcir la durée fait anonymiser, de façon irréversible, les lignes de journal plus anciennes au prochain passage du job quotidien (03:15 UTC)."
        confirmLabel="Enregistrer la durée" destructive requireReason
        onConfirm={async (reason) => {
          const r = await setCompanyRetention(row.companyId, Number(days), reason);
          router.refresh();
          if (!r.ok) throw new Error(r.error);
        }}
      >
        <label className="block text-sm font-medium" htmlFor="retention-days">Nouvelle durée (jours)</label>
        <Input id="retention-days" type="number" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value)} aria-label="Nouvelle durée (jours)" />
      </ConfirmDialog>
    </>
  );
}
