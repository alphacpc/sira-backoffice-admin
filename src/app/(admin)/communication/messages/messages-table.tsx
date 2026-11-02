"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { messageStatusBadge, notificationChannelLabel } from "@/lib/labels";
import type { MessageRow } from "@/lib/repos/communication";

const columns: ColumnDef<MessageRow, unknown>[] = [
  { accessorKey: "subject", header: "Objet", cell: ({ row }) => <span className="font-medium">{row.original.subject}</span> },
  { accessorKey: "campaignName", header: "Campagne" },
  { accessorKey: "companyName", header: "Compagnie" },
  { id: "channel", header: "Canal", accessorFn: (r) => notificationChannelLabel(r.channel) },
  {
    accessorKey: "content", header: "Texte",
    cell: ({ row }) => (
      <span className="text-muted-foreground">
        {row.original.content.length > 80 ? `${row.original.content.slice(0, 80)}…` : row.original.content}
      </span>
    ),
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = messageStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
];

export function MessagesTable({ messages }: { messages: MessageRow[] }) {
  return (
    <DataTable
      columns={columns} data={messages} rowHref={(r) => `/communication/campagnes/${r.campaignId}?onglet=messages`}
      searchPlaceholder="Rechercher un message…" emptyMessage="Aucun message."
    />
  );
}
