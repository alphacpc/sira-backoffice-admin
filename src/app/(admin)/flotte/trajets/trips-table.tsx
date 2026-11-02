"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { tripStatusBadge } from "@/lib/labels";
import type { TripRow } from "@/lib/repos/fleet";

const columns: ColumnDef<TripRow, unknown>[] = [
  { accessorKey: "routeLabel", header: "Ligne", cell: ({ row }) => <span className="font-medium">{row.original.routeLabel}</span> },
  { accessorKey: "departure", header: "Départ", cell: ({ row }) => formatDateTime(row.original.departure) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = tripStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "price", header: "Prix", cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span> },
  {
    accessorKey: "availableSeats", header: "Places libres",
    cell: ({ row }) => <span className="tabular-nums">{row.original.availableSeats} / {row.original.totalSeats}</span>,
  },
  { accessorKey: "busPlate", header: "Bus" },
  { accessorKey: "companyName", header: "Compagnie" },
];

export function TripsTable({ trips }: { trips: TripRow[] }) {
  return (
    <DataTable
      columns={columns} data={trips} rowHref={(t) => `/flotte/trajets/${t.id}`}
      searchPlaceholder="Rechercher un trajet…" emptyMessage="Aucun trajet."
    />
  );
}
