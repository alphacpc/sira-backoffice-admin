"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import type { JournalRow } from "@/lib/repos/backoffice";

const columns: ColumnDef<JournalRow, unknown>[] = [
  { accessorKey: "at", header: "Date", cell: ({ row }) => formatDateTime(row.original.at) },
  { accessorKey: "actor", header: "Acteur" },
  { accessorKey: "action", header: "Action" },
  { id: "company", header: "Compagnie", accessorFn: (r) => r.companyName ?? "Plateforme" },
];

export function JournalTable({ rows }: { rows: JournalRow[] }) {
  return <DataTable columns={columns} data={rows} rowId={(r) => r.id} searchPlaceholder="Rechercher dans le journal…" emptyMessage="Aucune entrée." />;
}
