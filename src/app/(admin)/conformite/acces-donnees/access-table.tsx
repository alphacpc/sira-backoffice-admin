"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import { accessReasonLabel, accessTypeLabel, dataCategoryLabel } from "@/lib/labels";
import type { AccessRow } from "@/lib/repos/compliance";

const SUBJECT_TYPE = { CUSTOMER: "Client", EMPLOYEE: "Employé", USER: "Utilisateur" } as const;

const columns: ColumnDef<AccessRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "accessedByLabel", header: "Consulté par" },
  { id: "subject", header: "Personne concernée", accessorFn: (r) => `${SUBJECT_TYPE[r.subjectType]} ${r.subjectName}`,
    cell: ({ row }) => (
      <span>{row.original.subjectName} <span className="text-xs text-muted-foreground">({SUBJECT_TYPE[row.original.subjectType]})</span></span>
    ) },
  { id: "category", header: "Catégorie", accessorFn: (r) => dataCategoryLabel(r.dataCategory) },
  { id: "reason", header: "Motif", accessorFn: (r) => accessReasonLabel(r.accessReason) },
  { id: "type", header: "Accès", accessorFn: (r) => accessTypeLabel(r.accessType) },
  { accessorKey: "ipTruncated", header: "Adresse IP" },
];

export function AccessTable({ lines }: { lines: AccessRow[] }) {
  return (
    <DataTable
      columns={columns} data={lines}
      searchPlaceholder="Rechercher un accès…" emptyMessage="Aucun accès enregistré."
    />
  );
}
