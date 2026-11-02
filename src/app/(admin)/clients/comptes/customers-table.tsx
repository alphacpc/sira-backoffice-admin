"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatNumber } from "@/lib/format";
import type { CustomerRow } from "@/lib/repos/clients";

const num = (n: number) => <span className="tabular-nums">{formatNumber(n)}</span>;

const columns: ColumnDef<CustomerRow, unknown>[] = [
  { accessorKey: "name", header: "Client", cell: ({ row }) => <span className="font-medium">{row.original.name}</span> },
  { id: "kind", header: "Type", accessorFn: (r) => (r.isCorporate ? "Entreprise" : "Particulier") },
  { accessorKey: "accountCount", header: "Comptes de fidélité", cell: ({ row }) => num(row.original.accountCount) },
  { accessorKey: "totalPoints", header: "Points", cell: ({ row }) => num(row.original.totalPoints) },
  { accessorKey: "onlineBookings", header: "Réservations en ligne", cell: ({ row }) => num(row.original.onlineBookings) },
  { accessorKey: "parcelCount", header: "Colis envoyés", cell: ({ row }) => num(row.original.parcelCount) },
  { accessorKey: "feedbackCount", header: "Avis", cell: ({ row }) => num(row.original.feedbackCount) },
  { id: "sponsored", header: "Parrainé", accessorFn: (r) => (r.sponsored ? "Oui" : "Non") },
  {
    accessorKey: "userStatus", header: "Compte",
    cell: ({ row }) => (
      <StatusBadge tone={row.original.userStatus === "active" ? "success" : "warning"}>
        {row.original.userStatus === "active" ? "Actif" : "Suspendu"}
      </StatusBadge>
    ),
  },
  { accessorKey: "createdAt", header: "Client depuis le", cell: ({ row }) => formatDate(row.original.createdAt) },
];

export function CustomersTable({ customers }: { customers: CustomerRow[] }) {
  return (
    <DataTable
      columns={columns} data={customers} rowHref={(r) => `/clients/comptes/${r.id}`}
      searchPlaceholder="Rechercher un client…" emptyMessage="Aucun client."
    />
  );
}
