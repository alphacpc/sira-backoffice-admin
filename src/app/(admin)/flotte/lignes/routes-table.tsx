"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { routeStatusBadge } from "@/lib/labels";
import type { RouteRow } from "@/lib/repos/fleet";

const columns: ColumnDef<RouteRow, unknown>[] = [
  { accessorKey: "label", header: "Ligne", cell: ({ row }) => <span className="font-medium">{row.original.label}</span> },
  { accessorKey: "distanceKm", header: "Distance", cell: ({ row }) => <span className="tabular-nums">{row.original.distanceKm} km</span> },
  {
    accessorKey: "durationMinutes", header: "Durée",
    cell: ({ row }) => <span className="tabular-nums">{Math.floor(row.original.durationMinutes / 60)} h {String(row.original.durationMinutes % 60).padStart(2, "0")}</span>,
  },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = routeStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "busCount", header: "Bus", cell: ({ row }) => <span className="tabular-nums">{row.original.busCount}</span> },
  { accessorKey: "tripCount", header: "Trajets", cell: ({ row }) => <span className="tabular-nums">{row.original.tripCount}</span> },
];

export function RoutesTable({ routes }: { routes: RouteRow[] }) {
  return (
    <DataTable
      columns={columns} data={routes} rowHref={(r) => `/flotte/lignes/${r.id}`}
      searchPlaceholder="Rechercher une ligne…" emptyMessage="Aucune ligne."
    />
  );
}
