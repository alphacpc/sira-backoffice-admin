"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import { busStatusBadge } from "@/lib/labels";
import type { BusRow } from "@/lib/repos/fleet";

const columns: ColumnDef<BusRow, unknown>[] = [
  { accessorKey: "plate", header: "Plaque", cell: ({ row }) => <span className="font-medium">{row.original.plate}</span> },
  { accessorKey: "busCode", header: "Code", cell: ({ row }) => <span className="font-mono text-xs">{row.original.busCode}</span> },
  { accessorKey: "brandModel", header: "Marque et modèle" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "fleetName", header: "Flotte", cell: ({ row }) => row.original.fleetName ?? "—" },
  { accessorKey: "routeLabel", header: "Ligne", cell: ({ row }) => row.original.routeLabel ?? "—" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = busStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "seatCapacity", header: "Capacité", cell: ({ row }) => <span className="tabular-nums">{row.original.seatCapacity} places</span> },
  {
    accessorKey: "driverName", header: "Équipage",
    cell: ({ row }) => row.original.driverName ?? <span className="text-muted-foreground">Aucun conducteur</span>,
  },
  { accessorKey: "nextMaintenanceDate", header: "Prochaine maintenance", cell: ({ row }) => formatDate(row.original.nextMaintenanceDate) },
];

export function BusesTable({ buses }: { buses: BusRow[] }) {
  return (
    <DataTable
      columns={columns} data={buses} rowHref={(b) => `/flotte/bus/${b.id}`}
      searchPlaceholder="Rechercher un bus…" emptyMessage="Aucun bus."
    />
  );
}
