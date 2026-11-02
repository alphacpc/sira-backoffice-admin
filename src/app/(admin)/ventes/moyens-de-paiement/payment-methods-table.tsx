"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { paymentKindLabel } from "@/lib/labels";
import type { PaymentMethodRow } from "@/lib/repos/sales";

const columns: ColumnDef<PaymentMethodRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "name", header: "Moyen de paiement", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "kind", header: "Type", accessorFn: (r) => paymentKindLabel(r.kind) },
  { accessorKey: "provider", header: "Opérateur", cell: ({ row }) => row.original.provider ?? "—" },
  {
    accessorKey: "active", header: "État",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.active ? "success" : "neutral"}>{row.original.active ? "Actif" : "Inactif"}</StatusBadge>
    ),
  },
  { accessorKey: "transactions", header: "Transactions", cell: ({ row }) => <span className="tabular-nums">{row.original.transactions}</span> },
  { accessorKey: "completed", header: "Réussies", cell: ({ row }) => <span className="tabular-nums">{row.original.completed}</span> },
  { accessorKey: "failed", header: "Échouées", cell: ({ row }) => <span className="tabular-nums">{row.original.failed}</span> },
  {
    accessorKey: "successRate", header: "Taux de réussite",
    cell: ({ row }) => (row.original.successRate === null ? "—" : <span className="tabular-nums">{row.original.successRate} %</span>),
  },
];

export function PaymentMethodsTable({ methods }: { methods: PaymentMethodRow[] }) {
  return (
    <DataTable
      columns={columns} data={methods}
      searchPlaceholder="Rechercher un moyen de paiement…" emptyMessage="Aucun moyen de paiement."
    />
  );
}
