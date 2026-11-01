"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { billingCycleLabel, subscriptionStatusBadge } from "@/lib/labels";
import type { SubscriptionRow } from "@/lib/repos/billing";

const columns: ColumnDef<SubscriptionRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
  { accessorKey: "planName", header: "Plan" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = subscriptionStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "billingCycle", header: "Cycle", cell: ({ row }) => billingCycleLabel(row.original.billingCycle) },
  {
    accessorKey: "price", header: "Prix",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span>,
  },
  { accessorKey: "nextBillingDate", header: "Prochaine échéance", cell: ({ row }) => formatDate(row.original.nextBillingDate) },
];

export function SubscriptionsTable({ subscriptions }: { subscriptions: SubscriptionRow[] }) {
  return (
    <DataTable
      columns={columns} data={subscriptions} rowHref={(s) => `/facturation/abonnements/${s.id}`}
      searchPlaceholder="Rechercher un abonnement…" emptyMessage="Aucun abonnement."
    />
  );
}
