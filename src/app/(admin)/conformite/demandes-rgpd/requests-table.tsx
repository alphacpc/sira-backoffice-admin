"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";
import type { DsrRow } from "@/lib/repos/compliance";

const columns: ColumnDef<DsrRow, unknown>[] = [
  { accessorKey: "requesterName", header: "Demandeur", cell: ({ row }) => <span className="font-medium">{row.original.requesterName}</span> },
  { id: "type", header: "Type", accessorFn: (r) => dsrTypeLabel(r.requestType) },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = dsrStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "dueDate", header: "Échéance", cell: ({ row }) => formatDate(row.original.dueDate) },
  {
    id: "deadline", header: "Délai", accessorFn: (r) => r.daysLeft ?? 9999,
    cell: ({ row }) => {
      const d = row.original.daysLeft;
      if (d === null) return "—";
      return (
        <StatusBadge tone={d < 0 ? "danger" : d <= 7 ? "warning" : "neutral"}>
          {d < 0 ? `En retard de ${-d} j` : `${d} j restants`}
        </StatusBadge>
      );
    },
  },
  { accessorKey: "handledBy", header: "Traité par", cell: ({ row }) => row.original.handledBy ?? "—" },
];

export function RequestsTable({ requests }: { requests: DsrRow[] }) {
  return (
    <DataTable
      columns={columns} data={requests} rowHref={(r) => `/conformite/demandes-rgpd/${r.id}`}
      searchPlaceholder="Rechercher une demande…" emptyMessage="Aucune demande."
    />
  );
}
