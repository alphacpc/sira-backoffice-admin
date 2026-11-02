"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Buildings, Crown, DeviceMobile, Monitor, ShieldCheck, Ticket, User, UsersFour } from "@phosphor-icons/react/dist/ssr";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDateTime } from "@/lib/format";
import type { UserRow } from "@/lib/repos/access";

export const ROLE_ICON = { ADMIN: Crown, MANAGER: UsersFour, GUICHETIER: Ticket, CHAUFFEUR: ShieldCheck, USER: User } as const;
const roleIcon = (code: string) => ROLE_ICON[code as keyof typeof ROLE_ICON] ?? User;

const STATUS = {
  active: { label: "Actif", cls: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" },
  suspended: { label: "Suspendu", cls: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" },
} as const;

const columns: ColumnDef<UserRow, unknown>[] = [
  {
    accessorKey: "displayName", header: "Utilisateur",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.displayName} />
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{row.original.displayName}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.username}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "roleName", header: "Rôle",
    cell: ({ row }) => {
      const Icon = roleIcon(row.original.roleCode);
      return <span className="inline-flex items-center gap-2 font-bold"><Icon size={18} weight="duotone" aria-hidden className="text-accent" />{row.original.roleName}</span>;
    },
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS[row.original.status].cls}`}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />{STATUS[row.original.status].label}
      </span>
    ),
  },
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (row.original.companyName
      ? <span className="inline-flex items-center gap-2"><Buildings size={16} weight="duotone" aria-hidden className="text-muted-foreground" />{row.original.companyName}</span>
      : <span className="text-muted-foreground">Plateforme</span>),
  },
  {
    accessorKey: "lastLoginAt", header: "Dernière connexion",
    cell: ({ row }) => (row.original.lastLoginAt
      ? <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.original.lastLoginAt)}</span>
      : <span className="text-muted-foreground">Jamais</span>),
  },
  {
    accessorKey: "activeSessions", header: "Sessions", meta: { align: "center" },
    cell: ({ row }) => {
      const n = row.original.activeSessions;
      const Icon = n > 1 ? Monitor : DeviceMobile;
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm tabular-nums ${n > 0 ? "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" : "bg-muted text-muted-foreground"}`}>
          <Icon size={14} weight="duotone" aria-hidden />{n}
        </span>
      );
    },
  },
];

export function UsersTable({ users, toolbar }: { users: UserRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      columns={columns} data={users} rowHref={(u) => `/utilisateurs/${u.id}`}
      searchable={false} toolbar={toolbar} emptyMessage="Aucun utilisateur."
    />
  );
}
