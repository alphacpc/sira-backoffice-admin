"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import type { FleetRow } from "@/lib/repos/fleet";

const columns: ColumnDef<FleetRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "depotName", header: "Dépôt de base", cell: ({ row }) => row.original.depotName ?? "—" },
  { accessorKey: "busCount", header: "Bus", cell: ({ row }) => <span className="tabular-nums">{row.original.busCount}</span> },
];

export function FleetsTable({ fleets }: { fleets: FleetRow[] }) {
  return <DataTable columns={columns} data={fleets} searchPlaceholder="Rechercher une flotte…" emptyMessage="Aucune flotte." />;
}
