"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatMoney } from "@/lib/format";
import { invoiceStatusBadge } from "@/lib/labels";
import type { InvoiceRow } from "@/lib/repos/billing";

const columns: ColumnDef<InvoiceRow, unknown>[] = [
  { accessorKey: "number", header: "Numéro", cell: ({ row }) => <span className="font-medium">{row.original.number}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = invoiceStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "issuedAt", header: "Émise le", cell: ({ row }) => formatDate(row.original.issuedAt) },
];

export function InvoicesTable({ invoices }: { invoices: InvoiceRow[] }) {
  return (
    <DataTable
      columns={columns} data={invoices} rowHref={(i) => `/facturation/factures/${i.id}`}
      searchPlaceholder="Rechercher une facture…" emptyMessage="Aucune facture."
    />
  );
}
