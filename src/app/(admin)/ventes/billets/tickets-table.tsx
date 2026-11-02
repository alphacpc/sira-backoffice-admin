"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { ticketStatusBadge } from "@/lib/labels";
import type { TicketRow } from "@/lib/repos/sales";

const columns: ColumnDef<TicketRow, unknown>[] = [
  { accessorKey: "ticketCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.ticketCode}</span> },
  { accessorKey: "bookingCode", header: "Réservation" },
  { accessorKey: "passengerName", header: "Passager" },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    id: "trip", header: "Trajet", accessorFn: (r) => `${r.routeLabel} ${formatDateTime(r.departure)}`,
    cell: ({ row }) => (
      <div>
        <div>{row.original.routeLabel}</div>
        <div className="text-xs text-muted-foreground">{formatDateTime(row.original.departure)}</div>
      </div>
    ),
  },
  { accessorKey: "seatNumber", header: "Siège", cell: ({ row }) => row.original.seatNumber ?? "—" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = ticketStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "issuedAt", header: "Émis le", cell: ({ row }) => formatDateTime(row.original.issuedAt) },
  { accessorKey: "scanCount", header: "Scans", cell: ({ row }) => <span className="tabular-nums">{row.original.scanCount}</span> },
];

export function TicketsTable({ tickets }: { tickets: TicketRow[] }) {
  return (
    <DataTable
      columns={columns} data={tickets} rowHref={(r) => `/ventes/billets/${r.ticketCode}`}
      searchPlaceholder="Rechercher un billet…" emptyMessage="Aucun billet."
    />
  );
}
