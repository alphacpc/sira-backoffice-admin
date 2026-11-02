"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Link from "next/link";
import { RevokeSessionButton } from "@/components/access/revoke-session-button";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime } from "@/lib/format";
import type { SessionRow } from "@/lib/repos/access";

const columns: ColumnDef<SessionRow, unknown>[] = [
  {
    accessorKey: "displayName", header: "Utilisateur",
    cell: ({ row }) => (
      <Link href={`/utilisateurs/${row.original.userId}`} className="font-medium hover:underline">
        {row.original.displayName}
      </Link>
    ),
  },
  { accessorKey: "username", header: "Identifiant", cell: ({ row }) => <span className="text-muted-foreground">{row.original.username}</span> },
  { accessorKey: "deviceLabel", header: "Appareil" },
  { accessorKey: "ip", header: "Adresse IP", cell: ({ row }) => <span className="font-mono text-xs">{row.original.ip}</span> },
  { accessorKey: "createdAt", header: "Début", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  { accessorKey: "lastSeenAt", header: "Dernière activité", cell: ({ row }) => formatDateTime(row.original.lastSeenAt) },
  { accessorKey: "expiresAt", header: "Expiration", cell: ({ row }) => formatDateTime(row.original.expiresAt) },
  {
    id: "action", header: "Action", enableSorting: false,
    cell: ({ row }) => (
      <RevokeSessionButton sessionId={row.original.id} label={`${row.original.username} · ${row.original.deviceLabel}`} />
    ),
  },
];

/** No rowHref: each row holds a button that opens a dialog (the user link is in a cell). */
export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  return (
    <DataTable
      columns={columns} data={sessions} rowId={(s) => s.id}
      searchPlaceholder="Rechercher une session…" emptyMessage="Aucune session active."
    />
  );
}
