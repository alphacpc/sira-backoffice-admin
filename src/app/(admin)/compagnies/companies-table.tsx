"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate } from "@/lib/format";
import { companyStatusBadge } from "@/lib/labels";
import type { Company } from "@/lib/types";

const columns: ColumnDef<Company, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "slug", header: "Identifiant", cell: ({ row }) => <span className="text-muted-foreground">{row.original.slug}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = companyStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "partnerTier", header: "Palier" },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDate(row.original.createdAt) },
  {
    accessorKey: "activatedAt", header: "Activée le",
    cell: ({ row }) => (row.original.activatedAt ? formatDate(row.original.activatedAt) : "—"),
  },
];

export function CompaniesTable({ companies }: { companies: Company[] }) {
  return (
    <DataTable
      columns={columns} data={companies} rowHref={(c) => `/compagnies/${c.id}`}
      searchPlaceholder="Rechercher une compagnie…"
    />
  );
}
