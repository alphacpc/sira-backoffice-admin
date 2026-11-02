"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";
import type { ParcelRow } from "@/lib/repos/parcels";

const columns: ColumnDef<ParcelRow, unknown>[] = [
  { accessorKey: "parcelCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.parcelCode}</span> },
  { accessorKey: "trackingNumber", header: "Suivi" },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "senderName", header: "Expéditeur" },
  { accessorKey: "recipientName", header: "Destinataire" },
  { accessorKey: "routeLabel", header: "Ligne" },
  { id: "type", header: "Type", accessorFn: (r) => parcelTypeLabel(r.parcelType) },
  { accessorKey: "weightKg", header: "Poids", cell: ({ row }) => <span className="tabular-nums">{row.original.weightKg} kg</span> },
  {
    accessorKey: "shippingFee", header: "Frais",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.shippingFee, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = parcelStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "paymentStatus", header: "Paiement",
    cell: ({ row }) => {
      const b = parcelPaymentBadge(row.original.paymentStatus);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "legCount", header: "Jambes", cell: ({ row }) => <span className="tabular-nums">{row.original.legCount}</span> },
  { accessorKey: "createdAt", header: "Créé le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function ParcelsTable({ parcels }: { parcels: ParcelRow[] }) {
  return (
    <DataTable
      columns={columns} data={parcels} rowHref={(r) => `/colis/${r.id}`}
      searchPlaceholder="Rechercher un colis…" emptyMessage="Aucun colis."
    />
  );
}
