"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { RetryPaymentButton } from "@/components/billing/retry-payment-button";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { subscriptionStatusBadge, urgencyBadge } from "@/lib/labels";
import type { UnpaidRow } from "@/lib/repos/billing";

const columns: ColumnDef<UnpaidRow, unknown>[] = [
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (
      <Link href={`/facturation/abonnements/${row.original.id}`} className="font-medium hover:underline">
        {row.original.companyName}
      </Link>
    ),
  },
  { accessorKey: "planName", header: "Plan" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = subscriptionStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "price", header: "Montant dû",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span>,
  },
  { accessorKey: "pastDueSince", header: "Impayé depuis", cell: ({ row }) => formatDate(row.original.pastDueSince) },
  {
    accessorKey: "daysLeft", header: "Urgence",
    cell: ({ row }) => {
      const b = urgencyBadge(row.original.deadline, row.original.daysLeft);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "action", header: "Action", enableSorting: false,
    cell: ({ row }) => <RetryPaymentButton subscriptionId={row.original.id} label={row.original.companyName} />,
  },
];

export function UnpaidTable({ rows }: { rows: UnpaidRow[] }) {
  return (
    <DataTable
      columns={columns} data={rows} rowId={(r) => r.id}
      searchPlaceholder="Rechercher une compagnie…" emptyMessage="Aucun impayé."
    />
  );
}
