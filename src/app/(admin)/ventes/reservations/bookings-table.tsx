"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney } from "@/lib/format";
import { bookingPaymentBadge, bookingStatusBadge, channelLabel } from "@/lib/labels";
import type { BookingRow } from "@/lib/repos/sales";

const columns: ColumnDef<BookingRow, unknown>[] = [
  { accessorKey: "bookingCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.bookingCode}</span> },
  { accessorKey: "passengerName", header: "Passager" },
  { accessorKey: "companyName", header: "Compagnie" },
  {
    id: "trip", header: "Trajet", accessorFn: (r) => `${r.routeLabel} ${formatDateTime(r.departure)}`,
    cell: ({ row }) => (
      <div>
        <div>{row.original.routeLabel}</div>
        <div className="text-xs text-muted-foreground">{formatDateTime(row.original.departure)}</div>
      </div>
    ),
  },
  { accessorKey: "seatNumber", header: "Siège", cell: ({ row }) => row.original.seatNumber ?? "—" },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  { id: "channel", header: "Canal", accessorFn: (r) => channelLabel(r.channel) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = bookingStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    accessorKey: "paymentStatus", header: "Paiement",
    cell: ({ row }) => {
      const b = bookingPaymentBadge(row.original.paymentStatus);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function BookingsTable({ bookings }: { bookings: BookingRow[] }) {
  return (
    <DataTable
      columns={columns} data={bookings} rowHref={(r) => `/ventes/reservations/${r.id}`}
      searchPlaceholder="Rechercher une réservation…" emptyMessage="Aucune réservation."
    />
  );
}
