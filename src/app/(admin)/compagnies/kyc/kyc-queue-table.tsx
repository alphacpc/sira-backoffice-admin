"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { KycActions } from "@/components/company/kyc-actions";
import { DataTable } from "@/components/data/data-table";
import { formatDate } from "@/lib/format";
import type { KycQueueItem } from "@/lib/repos/companies";

const columns: ColumnDef<KycQueueItem, unknown>[] = [
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (
      <Link href={`/compagnies/${row.original.companyId}?onglet=kyc`} className="font-medium hover:underline">
        {row.original.companyName}
      </Link>
    ),
  },
  { accessorKey: "typeName", header: "Document" },
  { accessorKey: "uploadedAt", header: "Déposé le", cell: ({ row }) => formatDate(row.original.uploadedAt) },
  {
    id: "actions", header: "Actions", enableSorting: false,
    cell: ({ row }) => <KycActions docId={row.original.id} docLabel={`${row.original.typeName} de ${row.original.companyName}`} />,
  },
];

export function KycQueueTable({ items }: { items: KycQueueItem[] }) {
  return (
    <DataTable
      columns={columns} data={items} searchPlaceholder="Rechercher une compagnie ou un document…"
      emptyMessage="Aucun document en attente de revue."
    />
  );
}
