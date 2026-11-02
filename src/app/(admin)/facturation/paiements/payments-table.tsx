"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentStatusBadge } from "@/lib/labels";
import type { PaymentRow } from "@/lib/repos/billing";

const columns: ColumnDef<PaymentRow, unknown>[] = [
  { accessorKey: "at", header: "Date", cell: ({ row }) => formatDateTime(row.original.at) },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <span className="font-medium">{row.original.companyName}</span> },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = paymentStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "reason", header: "Motif", cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason ?? "—"}</span> },
  {
    accessorKey: "invoiceNumber", header: "Facture",
    cell: ({ row }) => (row.original.invoiceId && row.original.invoiceNumber ? (
      <Link href={`/facturation/factures/${row.original.invoiceId}`} className="hover:underline">{row.original.invoiceNumber}</Link>
    ) : "—"),
  },
  {
    id: "subscription", header: "Abonnement", enableSorting: false,
    cell: ({ row }) => (
      <Link href={`/facturation/abonnements/${row.original.subscriptionId}`} className="text-accent-text hover:underline">
        Voir l&apos;abonnement
      </Link>
    ),
  },
];

export function PaymentsTable({ payments }: { payments: PaymentRow[] }) {
  return (
    <DataTable
      columns={columns} data={payments}
      searchPlaceholder="Rechercher un paiement…" emptyMessage="Aucun paiement."
    />
  );
}
