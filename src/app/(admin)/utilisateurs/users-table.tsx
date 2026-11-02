"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { userStatusBadge } from "@/lib/labels";
import type { UserRow } from "@/lib/repos/access";

const columns: ColumnDef<UserRow, unknown>[] = [
  { accessorKey: "displayName", header: "Nom", cell: ({ row }) => <span className="font-medium">{row.original.displayName}</span> },
  { accessorKey: "username", header: "Identifiant", cell: ({ row }) => <span className="text-muted-foreground">{row.original.username}</span> },
  { accessorKey: "roleName", header: "Rôle" },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const b = userStatusBadge(row.original.status);
      return <StatusBadge tone={b.tone}>{b.label}</StatusBadge>;
    },
  },
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => row.original.companyName ?? "—" },
  {
    accessorKey: "lastLoginAt", header: "Dernière connexion",
    cell: ({ row }) => (row.original.lastLoginAt ? formatDateTime(row.original.lastLoginAt) : "Jamais"),
  },
  {
    accessorKey: "activeSessions", header: "Sessions actives",
    cell: ({ row }) => <span className="tabular-nums">{row.original.activeSessions}</span>,
  },
];

export function UsersTable({ users }: { users: UserRow[] }) {
  return (
    <DataTable
      columns={columns} data={users} rowHref={(u) => `/utilisateurs/${u.id}`}
      searchPlaceholder="Rechercher un utilisateur…" emptyMessage="Aucun utilisateur."
    />
  );
}
