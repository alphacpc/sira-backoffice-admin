"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { setCompanyRetention } from "@/app/(admin)/conformite/actions";
import { ConfirmDialog } from "@/components/data/confirm-dialog";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { companyStatusBadge } from "@/lib/labels";
import type { RetentionRow } from "@/lib/repos/compliance";

function ChangeRetention({ row }: { row: RetentionRow }) {
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

const columns: ColumnDef<RetentionRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = companyStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "effectiveDays", header: "Durée effective",
    cell: ({ row }) => <span className="tabular-nums">{row.original.effectiveDays} j{row.original.isCustom ? "" : " (défaut)"}</span>,
  },
  { accessorKey: "olderRows", header: "Lignes plus anciennes", cell: ({ row }) => <span className="tabular-nums">{row.original.olderRows}</span> },
  {
    accessorKey: "pendingRows", header: "Non anonymisées",
    cell: ({ row }) => (
      <span data-testid="retention-pending" className={`tabular-nums ${row.original.pendingRows > 0 ? "font-medium text-warning" : ""}`}>
        {row.original.pendingRows}
      </span>
    ),
  },
  { id: "actions", header: "", enableSorting: false, cell: ({ row }) => <ChangeRetention row={row.original} /> },
];

/** No `rowHref`: the rows hold a button that opens a dialog. */
export function RetentionTable({ rows }: { rows: RetentionRow[] }) {
  return (
    <DataTable
      columns={columns} data={rows} rowId={(r) => r.companyId} pageSize={25}
      searchPlaceholder="Rechercher une compagnie…" emptyMessage="Aucune compagnie."
    />
  );
}
