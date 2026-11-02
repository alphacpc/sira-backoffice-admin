"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { anomalyLabel, transactionStatusBadge } from "@/lib/labels";
import type { TransactionRow } from "@/lib/repos/sales";

const columns: ColumnDef<TransactionRow, unknown>[] = [
  { accessorKey: "reference", header: "Référence", cell: ({ row }) => <span className="font-medium">{row.original.reference}</span> },
  { accessorKey: "bookingCode", header: "Réservation" },
  { accessorKey: "passengerName", header: "Passager" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "methodName", header: "Moyen" },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = transactionStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "createdAt", header: "Date", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  {
    id: "anomalies", header: "Incohérences", accessorFn: (r) => r.anomalies.map(anomalyLabel).join(" "),
    cell: ({ row }) => (row.original.anomalies.length === 0 ? "—" : (
      <div className="flex flex-wrap gap-1">
        {row.original.anomalies.map((k) => <StatusBadge key={k} tone="danger">{anomalyLabel(k)}</StatusBadge>)}
      </div>
    )),
  },
];

export function TransactionsTable({ transactions }: { transactions: TransactionRow[] }) {
  return (
    <DataTable
      columns={columns} data={transactions} rowHref={(r) => `/ventes/paiements/${r.id}`}
      searchPlaceholder="Rechercher un paiement…" emptyMessage="Aucun paiement."
    />
  );
}
