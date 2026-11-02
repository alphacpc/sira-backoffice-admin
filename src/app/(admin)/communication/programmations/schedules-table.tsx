"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CancelScheduleButton } from "@/components/communication/cancel-schedule-button";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { notificationChannelLabel, scheduleStatusBadge } from "@/lib/labels";
import type { ScheduleRow } from "@/lib/repos/communication";

const columns: ColumnDef<ScheduleRow, unknown>[] = [
  { accessorKey: "scheduledAt", header: "Prévue le", cell: ({ row }) => formatDateTime(row.original.scheduledAt) },
  { accessorKey: "campaignName", header: "Campagne", cell: ({ row }) => <span className="font-medium">{row.original.campaignName}</span> },
  { accessorKey: "companyName", header: "Compagnie" },
  { accessorKey: "messageSubject", header: "Message" },
  { id: "channel", header: "Canal", accessorFn: (r) => notificationChannelLabel(r.channel) },
  { accessorKey: "segmentName", header: "Segment" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = scheduleStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "recipientsCount", header: "Destinataires", cell: ({ row }) => <span className="tabular-nums">{row.original.recipientsCount}</span> },
  { accessorKey: "sentAt", header: "Envoyée le", cell: ({ row }) => (row.original.sentAt ? formatDateTime(row.original.sentAt) : "—") },
  {
    id: "actions", header: "", enableSorting: false,
    cell: ({ row }) => (row.original.cancellable
      ? <CancelScheduleButton scheduleId={row.original.id} subject={row.original.messageSubject} />
      : null),
  },
];

/** No `rowHref`: the rows hold a button that opens a dialog. */
export function SchedulesTable({ schedules }: { schedules: ScheduleRow[] }) {
  return (
    <DataTable
      columns={columns} data={schedules} rowId={(r) => r.id}
      searchPlaceholder="Rechercher une programmation…" emptyMessage="Aucune programmation."
    />
  );
}
