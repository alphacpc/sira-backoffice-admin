"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DeviceMobile, Globe, Laptop } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { RevokeSessionButton } from "@/components/access/revoke-session-button";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDateTime } from "@/lib/format";
import type { SessionRow } from "@/lib/repos/access";

function DeviceIcon({ label }: { label: string }) {
  const mobile = /iphone|android/i.test(label);
  const Icon = mobile ? DeviceMobile : Laptop;
  return <Icon size={20} weight="duotone" aria-hidden className="shrink-0 text-accent" />;
}

const columns: ColumnDef<SessionRow, unknown>[] = [
  {
    accessorKey: "displayName", header: "Utilisateur",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.displayName} />
        <div className="min-w-0">
          <Link href={`/utilisateurs/${row.original.userId}`} className="block truncate text-base font-semibold hover:underline">{row.original.displayName}</Link>
          <p className="truncate text-xs text-muted-foreground">{row.original.username}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "deviceLabel", header: "Appareil",
    cell: ({ row }) => <span className="inline-flex items-center gap-2 font-medium"><DeviceIcon label={row.original.deviceLabel} />{row.original.deviceLabel}</span>,
  },
  {
    accessorKey: "ip", header: "Adresse IP",
    cell: ({ row }) => <span className="inline-flex items-center gap-1.5 font-mono text-xs"><Globe size={14} aria-hidden className="text-muted-foreground" />{row.original.ip}</span>,
  },
  { accessorKey: "createdAt", header: "Début", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.original.createdAt)}</span> },
  { accessorKey: "lastSeenAt", header: "Dernière activité", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.original.lastSeenAt)}</span> },
  { accessorKey: "expiresAt", header: "Expiration", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDateTime(row.original.expiresAt)}</span> },
  {
    id: "action", header: "Action", enableSorting: false, meta: { align: "center" },
    cell: ({ row }) => <RevokeSessionButton sessionId={row.original.id} label={`${row.original.username} · ${row.original.deviceLabel}`} />,
  },
];

/** No rowHref: each row holds a button that opens a dialog (the user link is in a cell). */
export function SessionsTable({ sessions, toolbar }: { sessions: SessionRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={columns} data={sessions} rowId={(s) => s.id} searchable={false} toolbar={toolbar} emptyMessage="Aucune session active." />;
}
