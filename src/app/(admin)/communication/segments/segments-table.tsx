"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDate } from "@/lib/format";
import type { SegmentRow } from "@/lib/repos/communication";

const columns: ColumnDef<SegmentRow, unknown>[] = [
  { accessorKey: "name", header: "Segment", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "campaign", header: "Campagne", accessorFn: (r) => r.campaignName ?? "Réutilisable", cell: ({ row }) => row.original.campaignName ?? "Réutilisable" },
  { accessorKey: "criteriaLabel", header: "Ciblage" },
  { accessorKey: "estimatedSize", header: "Taille estimée", cell: ({ row }) => <span className="tabular-nums">{row.original.estimatedSize}</span> },
  { accessorKey: "eligibleNow", header: "Éligibles aujourd'hui", cell: ({ row }) => <span className="tabular-nums">{row.original.eligibleNow}</span> },
  { accessorKey: "createdAt", header: "Créé le", cell: ({ row }) => formatDate(row.original.createdAt) },
];

export function SegmentsTable({ segments }: { segments: SegmentRow[] }) {
  return (
    <DataTable
      columns={columns} data={segments}
      searchPlaceholder="Rechercher un segment…" emptyMessage="Aucun segment."
    />
  );
}
