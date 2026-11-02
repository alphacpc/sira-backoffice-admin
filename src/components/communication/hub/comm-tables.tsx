"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Circle, Megaphone, Warning } from "@phosphor-icons/react/dist/ssr";
import { CancelScheduleButton } from "@/components/communication/cancel-schedule-button";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import { notificationTypeLabel } from "@/lib/labels";
import type { NotificationRow } from "@/lib/repos/communication";
import { cn } from "@/lib/utils";
import { ChannelChip } from "./channel";

const STATUS = {
  SENT: ["Envoyée", "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300"],
  FAILED: ["Échouée", "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300"],
  PENDING: ["En attente", "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300"],
} as const;

const columns: ColumnDef<NotificationRow, unknown>[] = [
  {
    accessorKey: "notificationCode", header: "Notification",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><Megaphone size={22} weight="duotone" aria-hidden /></span>
        <div><p className="font-mono text-sm font-bold">{row.original.notificationCode}</p><p className="text-xs text-muted-foreground">{notificationTypeLabel(row.original.notificationType)}</p></div>
      </div>
    ),
  },
  { accessorKey: "recipientLabel", header: "Destinataire", cell: ({ row }) => <div><p className="font-semibold">{row.original.recipientLabel}</p><p className="text-xs text-muted-foreground">{row.original.companyName}</p></div> },
  { id: "channel", header: "Canal", accessorFn: (r) => r.channel, cell: ({ row }) => <ChannelChip channel={row.original.channel} compact /> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => { const [l, c] = STATUS[row.original.status]; return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", c)}>{row.original.status === "FAILED" ? <Warning size={13} weight="fill" aria-hidden /> : <span aria-hidden className="size-1.5 rounded-full bg-current" />}{l}</span>; },
  },
  {
    id: "read", header: "Lue", meta: { align: "center" }, accessorFn: (r) => (r.read ? 1 : 0),
    cell: ({ row }) => (row.original.read ? <CheckCircle size={20} weight="fill" aria-label="Lue" className="inline text-lime-600" /> : <Circle size={20} aria-label="Non lue" className="inline text-muted-foreground/40" />),
  },
  { accessorKey: "createdAt", header: "Envoyée", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDateTime(row.original.createdAt)}</span> },
];

export function NotificationsList({ rows, toolbar }: { rows: NotificationRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={columns} data={rows} rowHref={(n) => `/communication/notifications/${n.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucune notification pour ces critères." />;
}

export { CancelScheduleButton };
