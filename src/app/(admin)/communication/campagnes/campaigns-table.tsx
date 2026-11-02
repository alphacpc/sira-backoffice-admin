"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { campaignStatusBadge, objectiveLabel } from "@/lib/labels";
import type { CampaignRow } from "@/lib/repos/communication";

const columns: ColumnDef<CampaignRow, unknown>[] = [
  { accessorKey: "name", header: "Campagne", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "objective", header: "Objectif", accessorFn: (r) => objectiveLabel(r.objective) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = campaignStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "period", header: "Période", accessorFn: (r) => `${formatDate(r.startDate)} ${formatDate(r.endDate)}`,
    cell: ({ row }) => `${formatDate(row.original.startDate)} → ${formatDate(row.original.endDate)}`,
  },
  {
    accessorKey: "budget", header: "Budget",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.budget, row.original.currency)}</span>,
  },
  { accessorKey: "scheduleCount", header: "Programmations", cell: ({ row }) => <span className="tabular-nums">{row.original.scheduleCount}</span> },
];

export function CampaignsTable({ campaigns }: { campaigns: CampaignRow[] }) {
  return (
    <DataTable
      columns={columns} data={campaigns} rowHref={(r) => `/communication/campagnes/${r.id}`}
      searchPlaceholder="Rechercher une campagne…" emptyMessage="Aucune campagne."
    />
  );
}
