"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import type { SeatMapRow } from "@/lib/repos/fleet";

const count = (value: number) => <span className="tabular-nums">{value}</span>;

const columns: ColumnDef<SeatMapRow, unknown>[] = [
  { accessorKey: "busPlate", header: "Bus", cell: ({ row }) => <span className="font-medium">{row.original.busPlate}</span> },
  { accessorKey: "routeLabel", header: "Trajet" },
  { accessorKey: "departure", header: "Départ", cell: ({ row }) => formatDateTime(row.original.departure) },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "total", header: "Sièges", cell: ({ row }) => count(row.original.total) },
  { accessorKey: "free", header: "Libres", cell: ({ row }) => count(row.original.free) },
  { accessorKey: "booked", header: "Réservés", cell: ({ row }) => count(row.original.booked) },
  { accessorKey: "occupied", header: "Occupés", cell: ({ row }) => count(row.original.occupied) },
];

/** A row opens the trip of the seat map. */
export function SeatMapsTable({ seatMaps }: { seatMaps: SeatMapRow[] }) {
  return (
    <DataTable
      columns={columns} data={seatMaps} rowHref={(m) => `/flotte/trajets/${m.tripId}`}
      searchPlaceholder="Rechercher un plan de sièges…" emptyMessage="Aucun plan de sièges."
    />
  );
}
