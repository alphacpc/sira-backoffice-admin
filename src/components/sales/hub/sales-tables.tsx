"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight, Globe, Receipt, Storefront, Warning } from "@phosphor-icons/react/dist/ssr";
import Image from "next/image";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDateTime, formatMoney } from "@/lib/format";
import { paymentLogo } from "@/lib/payment-logos";
import type { BookingRow, TransactionRow } from "@/lib/repos/sales";
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
function Passenger({ name, sub }: { name: string; sub?: string }) {
  return (
    <div className="flex items-center gap-3">
      <CompanyAvatar name={name} />
      <div className="min-w-0"><p className="truncate font-semibold">{name}</p>{sub && <p className="truncate text-xs text-muted-foreground">{sub}</p>}</div>
    </div>
  );
}

const bookingColumns: ColumnDef<BookingRow, unknown>[] = [
  {
    accessorKey: "bookingCode", header: "Réservation",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><Receipt size={22} weight="duotone" aria-hidden /></span>
        <div><p className="font-mono text-sm font-bold">{row.original.bookingCode}</p><p className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</p></div>
      </div>
    ),
  },
  { accessorKey: "passengerName", header: "Voyageur", cell: ({ row }) => <Passenger name={row.original.passengerName} sub={row.original.companyName} /> },
  {
    id: "trip", header: "Trajet", accessorFn: (r) => `${r.routeLabel} ${r.departure}`,
    cell: ({ row }) => {
      const [from, to] = row.original.routeLabel.split(" → ");
      return (
        <div>
          <p className="inline-flex items-center gap-1.5 font-bold">{from}<ArrowRight size={14} weight="bold" aria-hidden className="text-accent" />{to}</p>
          <p className="text-xs text-muted-foreground">{formatDateTime(row.original.departure)}{row.original.seatNumber ? ` · Siège ${row.original.seatNumber}` : ""}</p>
        </div>
      );
    },
  },
  {
    id: "channel", header: "Canal", accessorFn: (r) => r.channel,
    cell: ({ row }) => (row.original.channel === "online"
      ? <span className="inline-flex items-center gap-1.5 font-medium"><Globe size={16} weight="duotone" aria-hidden className="text-sky-500" />En ligne</span>
      : <span className="inline-flex items-center gap-1.5 font-medium"><Storefront size={16} weight="duotone" aria-hidden className="text-orange-500" />Guichet</span>),
  },
  { accessorKey: "amount", header: "Montant", cell: ({ row }) => <span className="text-base font-bold tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span> },
  {
    accessorKey: "paymentStatus", header: "Paiement",
    cell: ({ row }) => <Pill tone={row.original.paymentStatus === "paid" ? "lime" : row.original.paymentStatus === "failed" ? "rose" : "orange"}>{row.original.paymentStatus === "paid" ? "Payé" : row.original.paymentStatus === "failed" ? "Échoué" : "En attente"}</Pill>,
  },
  { accessorKey: "status", header: "Statut", cell: ({ row }) => <Pill tone={row.original.status === "confirmed" ? "sky" : "zinc"}>{row.original.status === "confirmed" ? "Confirmée" : "Annulée"}</Pill> },
];

export function BookingsList({ rows, toolbar }: { rows: BookingRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={bookingColumns} data={rows} rowHref={(r) => `/ventes/reservations/${r.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucune réservation pour ces critères." />;
}

const ANOMALY = { STUCK: "Bloqué", AMOUNT_MISMATCH: "Montant différent", MISSING_TICKET: "Billet manquant" } as const;
const transactionColumns: ColumnDef<TransactionRow, unknown>[] = [
  {
    accessorKey: "reference", header: "Transaction",
    cell: ({ row }) => <div><p className="font-mono text-sm font-bold">{row.original.reference}</p><p className="text-xs text-muted-foreground">{formatDateTime(row.original.createdAt)}</p></div>,
  },
  { accessorKey: "passengerName", header: "Voyageur", cell: ({ row }) => <Passenger name={row.original.passengerName} sub={`${row.original.bookingCode} · ${row.original.companyName}`} /> },
  {
    accessorKey: "methodName", header: "Moyen",
    cell: ({ row }) => {
      const logo = paymentLogo(row.original.methodName);
      return (
        <span className="inline-flex items-center gap-2.5">
          {logo && <span className="relative block h-8 w-11 shrink-0"><Image src={logo} alt="" fill sizes="44px" unoptimized className="object-contain" /></span>}
          <span className="font-medium">{row.original.methodName}</span>
        </span>
      );
    },
  },
  { accessorKey: "amount", header: "Montant", cell: ({ row }) => <span className={cn("text-base font-bold tabular-nums", row.original.status === "FAILED" && "text-muted-foreground line-through")}>{formatMoney(row.original.amount, row.original.currency)}</span> },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => <Pill tone={row.original.status === "COMPLETED" ? "lime" : row.original.status === "FAILED" ? "rose" : "orange"}>{row.original.status === "COMPLETED" ? "Réussi" : row.original.status === "FAILED" ? "Échoué" : "En attente"}</Pill>,
  },
  {
    id: "anomalies", header: "Contrôle", accessorFn: (r) => r.anomalies.length,
    cell: ({ row }) => (row.original.anomalies.length === 0
      ? <span className="text-muted-foreground">RAS</span>
      : <span className="inline-flex flex-wrap gap-1.5">{row.original.anomalies.map((a) => <span key={a} className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-800 dark:bg-rose-400/15 dark:text-rose-300"><Warning size={12} weight="fill" aria-hidden />{ANOMALY[a]}</span>)}</span>),
  },
];

export function TransactionsList({ rows, toolbar }: { rows: TransactionRow[]; toolbar?: React.ReactNode }) {
  return <DataTable columns={transactionColumns} data={rows} rowHref={(r) => `/ventes/paiements/${r.id}`} searchable={false} toolbar={toolbar} emptyMessage="Aucun paiement pour ces critères." />;
}
