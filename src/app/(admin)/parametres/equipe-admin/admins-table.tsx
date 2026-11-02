"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { AdminActions } from "@/components/settings/admin-actions";
import { formatDate, formatDateTime } from "@/lib/format";
import { adminStatusBadge } from "@/lib/labels";
import type { AdminRow } from "@/lib/repos/backoffice";

const columns: ColumnDef<AdminRow, unknown>[] = [
  { accessorKey: "displayName", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span> },
  { accessorKey: "identifier", header: "Identifiant" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = adminStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  {
    id: "totp", header: "TOTP", accessorFn: (r) => (r.totpEnabled ? "Activé" : "Non enrôlé"),
    cell: ({ row }) => (row.original.totpEnabled
      ? <span>Activé <span className="text-xs text-muted-foreground">({row.original.recoveryCodesRemaining} codes)</span></span>
      : <span className="text-muted-foreground">Non enrôlé</span>),
  },
  { accessorKey: "activeSessions", header: "Sessions actives", cell: ({ row }) => <span data-testid="admin-sessions" className="tabular-nums">{row.original.activeSessions}</span> },
  { accessorKey: "lastLoginAt", header: "Dernière connexion", cell: ({ row }) => (row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : "—") },
  { accessorKey: "createdAt", header: "Créé le", cell: ({ row }) => formatDate(row.original.createdAt) },
  {
    id: "actions", header: "Actions", enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      return (
        <AdminActions
          adminId={r.id} identifier={r.identifier} status={r.status} totpEnabled={r.totpEnabled}
          activeSessions={r.activeSessions} isSelf={r.isSelf}
        />
      );
    },
  },
];

export function AdminsTable({ admins }: { admins: AdminRow[] }) {
  return <DataTable columns={columns} data={admins} rowId={(r) => r.id} searchPlaceholder="Rechercher un administrateur…" emptyMessage="Aucun administrateur." />;
}
