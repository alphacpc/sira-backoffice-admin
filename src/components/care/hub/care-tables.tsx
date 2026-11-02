"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Buildings, CalendarCheck, ChatCircleText, Crown, Medal, Package, Star, Warning } from "@phosphor-icons/react/dist/ssr";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate, formatMoney, formatNumber } from "@/lib/format";
import { parcelTypeLabel } from "@/lib/labels";
import type { TieredCustomer, TrackedParcel } from "@/lib/repos/care-hub";
import { cn } from "@/lib/utils";

const TONE = {
  lime: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300",
  sky: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300",
  orange: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300",
  violet: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300",
  rose: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300",
  zinc: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200",
} as const;
function Pill({ tone, children }: { tone: keyof typeof TONE; children: React.ReactNode }) {
  return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium", TONE[tone])}><span aria-hidden className="size-1.5 rounded-full bg-current" />{children}</span>;
}

const STEPS = ["Enregistré", "En transit", "Au hub", "Livré"] as const;
const STEP_OF: Record<string, number> = { PENDING: 0, IN_TRANSIT: 1, AT_HUB: 2, DELIVERED: 3 };
const EXCEPTION = { CANCELLED: ["Annulé", "zinc"], RETURNED: ["Retourné", "orange"], LOST: ["Perdu", "rose"] } as const;

/** Parcel tracker: four steps, filled up to the current one. */
export function Tracker({ status }: { status: string }) {
  const exception = EXCEPTION[status as keyof typeof EXCEPTION];
  if (exception) return <Pill tone={exception[1]}>{exception[0]}</Pill>;
  const at = STEP_OF[status] ?? 0;
  return (
    <div className="w-44" role="img" aria-label={`Suivi : ${STEPS[at]}`}>
      <div className="flex items-center">
        {STEPS.map((s, i) => (
          <div key={s} className="flex flex-1 items-center last:flex-none">
            <span className={cn("size-3 shrink-0 rounded-full border-2", i <= at ? (at === 3 ? "border-lime-500 bg-lime-500" : "border-accent bg-accent") : "border-border bg-card")} />
            {i < STEPS.length - 1 && <span className={cn("h-0.5 flex-1", i < at ? (at === 3 ? "bg-lime-500" : "bg-accent") : "bg-border")} />}
          </div>
        ))}
      </div>
      <p className={cn("mt-1.5 text-xs font-medium", at === 3 ? "text-lime-600" : "text-foreground")}>{STEPS[at]}</p>
    </div>
  );
}

const parcelColumns: ColumnDef<TrackedParcel, unknown>[] = [
  {
    accessorKey: "parcelCode", header: "Colis",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><Package size={22} weight="duotone" aria-hidden /></span>
        <div><p className="font-mono text-sm font-bold">{row.original.parcelCode}</p><p className="text-xs text-muted-foreground">{row.original.trackingNumber}</p></div>
      </div>
    ),
  },
  {
    id: "people", header: "Expéditeur → Destinataire", accessorFn: (r) => `${r.senderName} ${r.recipientName}`,
    cell: ({ row }) => (
      <div className="flex items-center gap-2.5">
        <CompanyAvatar name={row.original.senderName} size="sm" />
        <div className="min-w-0"><p className="inline-flex items-center gap-1.5 truncate font-semibold">{row.original.senderName}<ArrowRight size={12} weight="bold" aria-hidden className="shrink-0 text-accent" />{row.original.recipientName}</p><p className="truncate text-xs text-muted-foreground">{row.original.companyName}</p></div>
      </div>
    ),
  },
  { accessorKey: "routeLabel", header: "Trajet", cell: ({ row }) => <span className="font-medium">{row.original.routeLabel}</span> },
  {
    accessorKey: "parcelType", header: "Contenu",
    cell: ({ row }) => <div><p className="font-medium">{parcelTypeLabel(row.original.parcelType)}</p><p className="text-xs tabular-nums text-muted-foreground">{row.original.weightKg} kg</p></div>,
  },
  {
    accessorKey: "status", header: "Suivi",
    cell: ({ row }) => (
      <div className="space-y-1.5">
        <Tracker status={row.original.status} />
        {row.original.late && <p className="inline-flex items-center gap-1 text-xs font-medium text-rose-600"><Warning size={12} weight="fill" aria-hidden />En retard · prévu le {formatDate(row.original.expectedAt)}</p>}
      </div>
    ),
  },
  {
    accessorKey: "shippingFee", header: "Frais",
    cell: ({ row }) => <div><p className="font-bold tabular-nums">{formatMoney(row.original.shippingFee, row.original.currency)}</p><p className={cn("text-xs", row.original.paymentStatus === "PAID" ? "text-lime-600" : "text-orange-600")}>{row.original.paymentStatus === "PAID" ? "Payé" : row.original.paymentStatus === "REFUNDED" ? "Remboursé" : "En attente"}</p></div>,
  },
];

export function ParcelsList({ rows, toolbar }: { rows: TrackedParcel[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={parcelColumns} data={rows} rowHref={(p) => `/colis/${p.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucun colis pour ces critères." />;
}

const TIER = {
  REGULAR: { label: "Regular", cls: "bg-slate-100 text-slate-700 dark:bg-slate-400/15 dark:text-slate-300", icon: Medal },
  VIP: { label: "VIP", cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200", icon: Star },
  PREMIUM: { label: "Premium", cls: "bg-yellow-100 text-yellow-900 dark:bg-yellow-200/15 dark:text-yellow-200", icon: Crown },
} as const;

const customerColumns: ColumnDef<TieredCustomer, unknown>[] = [
  {
    accessorKey: "name", header: "Client",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.name} />
        <div className="min-w-0"><p className="truncate text-base font-semibold">{row.original.name}</p><p className="inline-flex items-center gap-1 text-xs text-muted-foreground">{row.original.isCorporate ? <><Buildings size={12} aria-hidden />Entreprise</> : "Particulier"}{row.original.sponsored && " · Parrainé"}</p></div>
      </div>
    ),
  },
  {
    accessorKey: "tier", header: "Palier",
    cell: ({ row }) => {
      if (!row.original.tier) return <span className="text-muted-foreground">Aucun compte</span>;
      const t = TIER[row.original.tier];
      return <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", t.cls)}><t.icon size={14} weight="fill" aria-hidden />{t.label}</span>;
    },
  },
  { accessorKey: "totalPoints", header: "Points", cell: ({ row }) => <span className="text-base font-bold tabular-nums">{formatNumber(row.original.totalPoints)}</span> },
  {
    id: "activity", header: "Activité", enableSorting: false,
    cell: ({ row }) => (
      <div className="flex items-center gap-4 text-sm tabular-nums">
        <span className="inline-flex items-center gap-1.5" title="Réservations en ligne"><CalendarCheck size={16} weight="duotone" aria-hidden className="text-sky-500" />{row.original.onlineBookings}</span>
        <span className="inline-flex items-center gap-1.5" title="Colis envoyés"><Package size={16} weight="duotone" aria-hidden className="text-orange-500" />{row.original.parcelCount}</span>
        <span className="inline-flex items-center gap-1.5" title="Avis"><ChatCircleText size={16} weight="duotone" aria-hidden className="text-violet-500" />{row.original.feedbackCount}</span>
      </div>
    ),
  },
  { accessorKey: "userStatus", header: "Compte", cell: ({ row }) => <Pill tone={row.original.userStatus === "active" ? "lime" : "orange"}>{row.original.userStatus === "active" ? "Actif" : "Suspendu"}</Pill> },
  { accessorKey: "createdAt", header: "Inscrit le", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums text-muted-foreground">{formatDate(row.original.createdAt)}</span> },
];

export function CustomersList({ rows, toolbar }: { rows: TieredCustomer[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={customerColumns} data={rows} rowHref={(c) => `/clients/comptes/${c.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucun client pour ces critères." />;
}

