"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { notificationChannelLabel, notificationStatusBadge, notificationTypeLabel } from "@/lib/labels";
import type { NotificationRow } from "@/lib/repos/communication";

const columns: ColumnDef<NotificationRow, unknown>[] = [
  { accessorKey: "notificationCode", header: "Code", cell: ({ row }) => <span className="font-medium">{row.original.notificationCode}</span> },
  { id: "type", header: "Type", accessorFn: (r) => notificationTypeLabel(r.notificationType) },
  { accessorKey: "recipientLabel", header: "Destinataire" },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "channel", header: "Canal", accessorFn: (r) => notificationChannelLabel(r.channel) },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = notificationStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { id: "read", header: "Lue", accessorFn: (r) => (r.read ? "Oui" : "Non") },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
];

export function NotificationsTable({ notifications }: { notifications: NotificationRow[] }) {
  return (
    <DataTable
      columns={columns} data={notifications} rowHref={(r) => `/communication/notifications/${r.id}`}
      searchPlaceholder="Rechercher une notification…" emptyMessage="Aucune notification."
    />
  );
}
