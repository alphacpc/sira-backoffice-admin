"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { maintenanceCategoryLabel, maintenanceStatusBadge } from "@/lib/labels";
import type { MaintenanceRow } from "@/lib/repos/fleet";

const columns: ColumnDef<MaintenanceRow, unknown>[] = [
  { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono text-xs">{row.original.code}</span> },
  { accessorKey: "busPlate", header: "Bus", cell: ({ row }) => <span className="font-medium">{row.original.busPlate}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "type", header: "Type",
    cell: ({ row }) => <>{row.original.type} <span className="text-xs text-muted-foreground">· {maintenanceCategoryLabel(row.original.category)}</span></>,
  },
  { accessorKey: "vendorName", header: "Fournisseur", cell: ({ row }) => row.original.vendorName ?? "Interne" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = maintenanceStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "scheduledDate", header: "Prévue le", cell: ({ row }) => formatDate(row.original.scheduledDate) },
  { accessorKey: "startedAt", header: "Commencée le", cell: ({ row }) => (row.original.startedAt ? formatDate(row.original.startedAt) : "—") },
  { accessorKey: "completedAt", header: "Terminée le", cell: ({ row }) => (row.original.completedAt ? formatDate(row.original.completedAt) : "—") },
  {
    accessorKey: "totalCost", header: "Coût total",
    cell: ({ row }) => (
      <span className="tabular-nums" title={`Main d'œuvre ${formatMoney(row.original.laborCost, row.original.currency)} + pièces ${formatMoney(row.original.partsCost, row.original.currency)}`}>
        {formatMoney(row.original.totalCost, row.original.currency)}
      </span>
    ),
  },
];

/** A row opens the maintenance tab of its bus. */
export function MaintenanceTable({ maintenances }: { maintenances: MaintenanceRow[] }) {
  return (
    <DataTable
      columns={columns} data={maintenances} rowHref={(m) => `/flotte/bus/${m.busId}?onglet=maintenance`}
      searchPlaceholder="Rechercher une maintenance…" emptyMessage="Aucune maintenance."
    />
  );
}
