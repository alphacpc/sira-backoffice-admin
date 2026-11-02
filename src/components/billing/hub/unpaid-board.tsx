"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Clock, Prohibit, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { RetryPaymentButton } from "@/components/billing/retry-payment-button";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate, formatMoney } from "@/lib/format";
import { urgencyBadge } from "@/lib/labels";
import type { UnpaidOwnerRow, Urgency } from "@/lib/repos/billing-hub";
import { cn } from "@/lib/utils";
import { OwnerContact } from "./owner-contact";
import { ReminderButton } from "./reminder-button";

const URGENCY: Record<Urgency, { bar: string; pill: string }> = {
  critical: { bar: "bg-rose-500", pill: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300" },
  soon: { bar: "bg-orange-500", pill: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" },
  normal: { bar: "bg-amber-400", pill: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300" },
};
const STATUS = {
  past_due: { label: "Impayé", icon: WarningCircle, cls: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300" },
  suspended: { label: "Suspendu", icon: Prohibit, cls: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300" },
} as const;

const columns: ColumnDef<UnpaidOwnerRow, unknown>[] = [
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.companyName} />
        <div className="min-w-0">
          <Link href={`/facturation/abonnements/${row.original.id}`} className="block truncate font-semibold hover:underline">{row.original.companyName}</Link>
          <p className="truncate text-xs text-muted-foreground">Offre <span className="font-bold text-foreground">{row.original.planName}</span></p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "ownerName", header: "Propriétaire",
    cell: ({ row }) => (row.original.ownerName ? (
      <div className="space-y-0.5">
        <p className="font-semibold">{row.original.ownerName}</p>
        {row.original.ownerEmail && <OwnerContact companyId={row.original.companyId} field="email" masked={row.original.ownerEmail} />}
        {row.original.ownerPhone && <OwnerContact companyId={row.original.companyId} field="phone" masked={row.original.ownerPhone} />}
      </div>
    ) : <span className="text-muted-foreground">—</span>),
  },
  {
    accessorKey: "price", header: "Montant dû",
    cell: ({ row }) => (
      <div>
        <p className="text-base font-bold tabular-nums">{formatMoney(row.original.price, row.original.currency)}</p>
        <p className="text-xs text-muted-foreground">depuis le {formatDate(row.original.pastDueSince)}</p>
      </div>
    ),
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const st = STATUS[row.original.status];
      return <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}><st.icon size={14} weight="fill" aria-hidden />{st.label}</span>;
    },
  },
  {
    accessorKey: "daysLeft", header: "Échéance",
    cell: ({ row }) => {
      const r = row.original;
      const u = URGENCY[r.urgency];
      const used = Math.min(100, Math.max(0, Math.round(((r.delayDays - r.daysLeft) / r.delayDays) * 100)));
      return (
        <div className="w-44 space-y-1.5">
          <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium", u.pill)}>
            <Clock size={12} aria-hidden />{urgencyBadge(r.deadline, r.daysLeft).label}
          </span>
          <div className="h-1.5 rounded-full bg-muted" aria-hidden><div className={cn("h-full rounded-full", u.bar)} style={{ width: `${used}%` }} /></div>
        </div>
      );
    },
  },
  {
    id: "action", header: "Actions", enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-start gap-2">
        <RetryPaymentButton subscriptionId={row.original.id} label={row.original.companyName} />
        <ReminderButton row={row.original} label="Relancer" variant="secondary" />
      </div>
    ),
  },
];

export function UnpaidTable({ rows }: { rows: UnpaidOwnerRow[] }) {
  return <DataTable columns={columns} data={rows} rowId={(r) => r.id} searchable={false} emptyMessage="Aucun dossier à recouvrer pour ces critères." />;
}
