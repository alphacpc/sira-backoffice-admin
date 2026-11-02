"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { feedbackStatusBadge, feedbackTypeLabel, ratingStars } from "@/lib/labels";
import type { FeedbackRow } from "@/lib/repos/clients";

const columns: ColumnDef<FeedbackRow, unknown>[] = [
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "customerName", header: "Client" },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "type", header: "Type", accessorFn: (r) => feedbackTypeLabel(r.feedbackType) },
  {
    accessorKey: "rating", header: "Note",
    cell: ({ row }) => <span aria-label={`Note ${row.original.rating} sur 5`}>{ratingStars(row.original.rating)}</span>,
  },
  { accessorKey: "title", header: "Titre", cell: ({ row }) => <span className="font-medium">{row.original.title}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = feedbackStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
];

export function FeedbackTable({ feedbacks }: { feedbacks: FeedbackRow[] }) {
  return (
    <DataTable
      columns={columns} data={feedbacks} rowHref={(r) => `/clients/avis/${r.id}`}
      searchPlaceholder="Rechercher un avis…" emptyMessage="Aucun avis."
    />
  );
}
