"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatMoney } from "@/lib/format";
import { vendorKindLabel } from "@/lib/labels";
import type { VendorRow } from "@/lib/repos/fleet";

const columns: ColumnDef<VendorRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "kind", header: "Type", cell: ({ row }) => vendorKindLabel(row.original.kind) },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "interventions", header: "Interventions", cell: ({ row }) => <span className="tabular-nums">{row.original.interventions}</span> },
  {
    accessorKey: "totalCost", header: "Coût cumulé",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.totalCost, row.original.currency)}</span>,
  },
];

export function VendorsTable({ vendors }: { vendors: VendorRow[] }) {
  return <DataTable columns={columns} data={vendors} searchPlaceholder="Rechercher un fournisseur…" emptyMessage="Aucun fournisseur." />;
}
