"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import type { StationRow } from "@/lib/repos/fleet";

const columns: ColumnDef<StationRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "city", header: "Ville" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "routeCount", header: "Lignes desservies", cell: ({ row }) => <span className="tabular-nums">{row.original.routeCount}</span> },
];

export function StationsTable({ stations }: { stations: StationRow[] }) {
  return <DataTable columns={columns} data={stations} searchPlaceholder="Rechercher une gare…" emptyMessage="Aucune gare." />;
}
