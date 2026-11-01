"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatMoney, formatNumber } from "@/lib/format";
import { planStatusBadge } from "@/lib/labels";
import type { PlanRow } from "@/lib/repos/billing";

const columns: ColumnDef<PlanRow, unknown>[] = [
  { accessorKey: "name", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { accessorKey: "code", header: "Code", cell: ({ row }) => <span className="font-mono text-xs text-muted-foreground">{row.original.code}</span> },
  {
    accessorKey: "priceMonthly", header: "Prix mensuel",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.priceMonthly, row.original.currency)}</span>,
  },
  {
    accessorKey: "priceYearly", header: "Prix annuel",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.priceYearly, row.original.currency)}</span>,
  },
  {
    accessorKey: "trialDays", header: "Essai",
    cell: ({ row }) => (row.original.trialDays > 0 ? `${row.original.trialDays} jours` : "Aucun"),
  },
  {
    accessorKey: "liveSubscriptions", header: "Abonnements en cours",
    cell: ({ row }) => <span className="tabular-nums">{formatNumber(row.original.liveSubscriptions)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = planStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
];

export function PlansTable({ plans }: { plans: PlanRow[] }) {
  return (
    <DataTable
      columns={columns} data={plans} rowHref={(p) => `/offre/plans/${p.id}`}
      searchPlaceholder="Rechercher un plan…" emptyMessage="Aucun plan."
    />
  );
}
