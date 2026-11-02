"use client";

import { Bus, HourglassMedium, Prohibit, Stack, Timer } from "@phosphor-icons/react/dist/ssr";
import type { ColumnDef } from "@tanstack/react-table";
import { DataTable } from "@/components/data/data-table";
import { formatDateTime, formatDuration } from "@/lib/format";
import { companyStatusBadge } from "@/lib/labels";
import type { CompanyRow } from "@/lib/repos/companies";

const STATUS_STYLE: Record<CompanyRow["status"], string> = {
  active: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  draft: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  suspended: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  closed: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
};

const TIER_STYLE: Record<CompanyRow["partnerTier"], string> = {
  STANDARD: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300",
  SILVER: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200",
  GOLD: "bg-stone-200 text-yellow-900 dark:bg-yellow-200/15 dark:text-yellow-200",
};

const columns: ColumnDef<CompanyRow, unknown>[] = [
  {
    accessorKey: "name", header: "Compagnie",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#ea580c] text-sm font-bold text-white">
          {row.original.name.trim().slice(0, 2).toUpperCase()}
        </span>
        <div className="min-w-0">
          <p className="truncate text-base font-semibold">{row.original.name}</p>
          <p className="truncate text-xs text-muted-foreground">{row.original.slug}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "ownerName", header: "Propriétaire",
    cell: ({ row }) => (row.original.ownerName
      ? <span className="font-medium">{row.original.ownerName}</span>
      : <span className="text-muted-foreground">—</span>),
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const status = row.original.status;
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS_STYLE[status]}`}>
          <span aria-hidden className="size-1.5 rounded-full bg-current" />
          {companyStatusBadge(status).label}
        </span>
      );
    },
  },
  {
    accessorKey: "partnerTier", header: "Palier",
    cell: ({ row }) => (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${TIER_STYLE[row.original.partnerTier]}`}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />
        {row.original.partnerTier}
      </span>
    ),
  },
  {
    accessorKey: "busCount", header: "Bus",
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2 font-medium tabular-nums">
        <Bus size={18} weight="duotone" aria-hidden className="text-muted-foreground" />
        {row.original.busCount}
      </span>
    ),
  },
  {
    accessorKey: "planName", header: "Offre",
    cell: ({ row }) => (row.original.planName
      ? (
        <span className="inline-flex items-center gap-2 font-bold">
          <Stack size={18} weight="duotone" aria-hidden className="text-accent" />
          {row.original.planName}
        </span>
      )
      : (
        <span className="inline-flex items-center gap-2 text-muted-foreground">
          <Prohibit size={18} aria-hidden /> Aucune offre
        </span>
      )),
  },
  {
    accessorKey: "billingCycle", header: "Facturation",
    cell: ({ row }) => (row.original.billingCycle
      ? (
        <span
          className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium shadow-sm ${
            row.original.billingCycle === "YEARLY" ? "bg-[#3f7a0a] text-white" : "bg-[#65a30d] text-white"
          }`}
        >
          {row.original.billingCycle === "YEARLY" ? "Annuelle" : "Mensuelle"}
        </span>
      )
      : <span className="text-muted-foreground">—</span>),
  },
  { accessorKey: "createdAt", header: "Créée le", cell: ({ row }) => formatDateTime(row.original.createdAt) },
  {
    accessorKey: "activatedAt", header: "Activée le",
    cell: ({ row }) => (row.original.activatedAt ? formatDateTime(row.original.activatedAt) : "—"),
  },
  {
    id: "activationDelay", header: "Délai d'activation", meta: { align: "center" },
    accessorFn: (c) => (c.activatedAt ? Date.parse(c.activatedAt) - Date.parse(c.createdAt) : null),
    cell: ({ row }) => {
      const c = row.original;
      const days = (ms: number) => Math.max(0, Math.floor(ms / 86_400_000));
      const wrap = "inline-flex items-center justify-center gap-1.5 tabular-nums";
      if (c.activatedAt) {
        const d = days(Date.parse(c.activatedAt) - Date.parse(c.createdAt));
        return (
          <span className={wrap}>
            <Timer size={16} weight="duotone" aria-hidden className="text-muted-foreground" />
            {d === 0 ? "Le jour même" : formatDuration(d)}
          </span>
        );
      }
      if (c.status === "draft") {
        return (
          <span className={`${wrap} text-warning`}>
            <HourglassMedium size={16} weight="duotone" aria-hidden />
            En attente depuis {formatDuration(days(Date.now() - Date.parse(c.createdAt)))}
          </span>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
];

export function CompaniesTable({ companies, toolbar }: { companies: CompanyRow[]; toolbar?: React.ReactNode }) {
  return (
    <DataTable
      columns={columns} data={companies} rowHref={(c) => `/compagnies/${c.id}`}
      searchPlaceholder="Rechercher une compagnie…" toolbar={toolbar}
    />
  );
}
