"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Stack } from "@phosphor-icons/react/dist/ssr";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatMoney, nextBillingLabel } from "@/lib/format";
import { subscriptionStatusBadge } from "@/lib/labels";
import type { OwnerSubscriptionRow } from "@/lib/repos/billing-hub";
import { OwnerContact } from "./owner-contact";
import { ReminderButton } from "./reminder-button";

const PILL = "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium";
const SUB_STATUS: Record<OwnerSubscriptionRow["status"], string> = {
  active: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  trial: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  past_due: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  suspended: "bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-300",
  expired: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200",
  canceled: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
};

function Company({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={name} />
      <div className="min-w-0">
        <p className="truncate font-semibold">{name}</p>
        {sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

const subscriptionColumns: ColumnDef<OwnerSubscriptionRow, unknown>[] = [
  { accessorKey: "companyName", header: "Compagnie", cell: ({ row }) => <Company name={row.original.companyName} /> },
  {
    accessorKey: "ownerName", header: "Propriétaire",
    cell: ({ row }) => (row.original.ownerName ? (
      <div className="min-w-0 space-y-0.5">
        <p className="font-semibold">{row.original.ownerName}</p>
        {row.original.ownerEmail && <OwnerContact companyId={row.original.companyId} field="email" masked={row.original.ownerEmail} />}
        {row.original.ownerPhone && <OwnerContact companyId={row.original.companyId} field="phone" masked={row.original.ownerPhone} />}
      </div>
    ) : <span className="text-muted-foreground">—</span>),
  },
  {
    accessorKey: "planName", header: "Offre",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 font-bold">
        <Stack size={18} weight="duotone" aria-hidden className="text-accent" />{row.original.planName}
      </span>
    ),
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => (
      <span className={`${PILL} ${SUB_STATUS[row.original.status]}`}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />{subscriptionStatusBadge(row.original.status).label}
      </span>
    ),
  },
  {
    accessorKey: "billingCycle", header: "Facturation",
    cell: ({ row }) => (
      <span className={`${PILL} font-medium text-white ${row.original.billingCycle === "YEARLY" ? "bg-[#3f7a0a]" : "bg-[#65a30d]"}`}>
        {row.original.billingCycle === "YEARLY" ? "Annuelle" : "Mensuelle"}
      </span>
    ),
  },
  {
    accessorKey: "price", header: "Prix",
    cell: ({ row }) => <span className="font-semibold tabular-nums">{formatMoney(row.original.price, row.original.currency)}</span>,
  },
  {
    accessorKey: "paidVolume", header: "Volume de paiements",
    cell: ({ row }) => (
      <div>
        <p className="font-bold tabular-nums">{formatMoney(row.original.paidVolume, row.original.currency)}</p>
        <p className="text-xs text-muted-foreground">
          {row.original.paidCount} paiement{row.original.paidCount > 1 ? "s" : ""}
          {row.original.failedCount > 0 && <span className="text-danger"> · {row.original.failedCount} échec{row.original.failedCount > 1 ? "s" : ""}</span>}
        </p>
      </div>
    ),
  },
  {
    accessorKey: "nextBillingDate", header: "Prochaine échéance",
    cell: ({ row }) => <span className="text-muted-foreground">{nextBillingLabel(row.original.status, row.original.nextBillingDate)}</span>,
  },
  { id: "action", header: "Action", enableSorting: false, cell: ({ row }) => <ReminderButton row={row.original} /> },
];

export function SubscriptionsTable({ rows, toolbar }: { rows: OwnerSubscriptionRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      columns={subscriptionColumns} data={rows} rowHref={(s) => `/facturation/abonnements/${s.id}`}
      searchable={false} toolbar={toolbar} emptyMessage="Aucun abonnement."
    />
  );
}
