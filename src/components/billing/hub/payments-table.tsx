"use client";

import type { ColumnDef } from "@tanstack/react-table";
import Image from "next/image";
import Link from "next/link";
import { DataTable } from "@/components/data/data-table";
import { CreditCard } from "@phosphor-icons/react/dist/ssr";
import { InvoiceModalLink } from "./invoice-modal-link";
import { OwnerContact } from "./owner-contact";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDateTime, formatMoney } from "@/lib/format";
import { PAYMENT_CHANNEL_LABEL, type ChannelPaymentRow, type PaymentChannel } from "@/lib/repos/billing-hub";

export const CHANNEL_LOGO: Record<PaymentChannel, string> = {
  WAVE: "/images/payments/wave.png", ORANGE_MONEY: "/images/payments/orange-money-trim.png",
  VISA: "/images/payments/visa.png", MASTERCARD: "/images/payments/mastercd.png",
};

export function ChannelBadge({ channel }: { channel: PaymentChannel }) {
  return (
    <span className="inline-flex items-center gap-2.5">
      <span className="relative block h-9 w-12 shrink-0">
        <Image src={CHANNEL_LOGO[channel]} alt="" fill sizes="48px" unoptimized className="object-contain p-1" />
      </span>
      <span className="font-medium">{PAYMENT_CHANNEL_LABEL[channel]}</span>
    </span>
  );
}

const STATUS = {
  paid: { label: "Payé", cls: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" },
  failed: { label: "Échoué", cls: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300" },
} as const;

const columns: ColumnDef<ChannelPaymentRow, unknown>[] = [
  { accessorKey: "at", header: "Date", cell: ({ row }) => <span className="whitespace-nowrap tabular-nums">{formatDateTime(row.original.at)}</span> },
  {
    accessorKey: "companyName", header: "Compagnie",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.companyName} />
        <span className="font-semibold">{row.original.companyName}</span>
      </div>
    ),
  },
  { accessorKey: "channel", header: "Canal", cell: ({ row }) => <ChannelBadge channel={row.original.channel} /> },
  {
    id: "payer", header: "Numéro / Carte", enableSorting: false,
    cell: ({ row }) => {
      const r = row.original;
      if (r.payerPhone) return <OwnerContact companyId={r.companyId} field="phone" masked={r.payerPhone} />;
      if (r.cardLast4) {
        return (
          <div className="space-y-0.5">
            <p className="flex items-center gap-1.5 font-medium tabular-nums"><CreditCard size={16} weight="duotone" aria-hidden className="text-muted-foreground" />•••• {r.cardLast4}</p>
            {r.cardHolder && <p className="text-xs text-muted-foreground">{r.cardHolder}</p>}
          </div>
        );
      }
      return <span className="text-muted-foreground">—</span>;
    },
  },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => (
      <span className={`font-semibold tabular-nums ${row.original.status === "failed" ? "text-muted-foreground line-through" : ""}`}>
        {formatMoney(row.original.amount, row.original.currency)}
      </span>
    ),
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${STATUS[row.original.status].cls}`}>
        <span aria-hidden className="size-1.5 rounded-full bg-current" />{STATUS[row.original.status].label}
      </span>
    ),
  },
  { accessorKey: "reason", header: "Motif", cell: ({ row }) => <span className="text-muted-foreground">{row.original.reason ?? "—"}</span> },
  {
    accessorKey: "invoiceNumber", header: "Facture", meta: { align: "center" },
    cell: ({ row }) => (row.original.invoiceId && row.original.invoiceNumber
      ? <InvoiceModalLink invoiceId={row.original.invoiceId} number={row.original.invoiceNumber} />
      : <span className="text-muted-foreground">—</span>),
  },
  {
    id: "subscription", header: "Abonnement", enableSorting: false, meta: { align: "center" },
    cell: ({ row }) => <Link href={`/facturation/abonnements/${row.original.subscriptionId}`} className="font-medium text-accent-text hover:underline">Voir</Link>,
  },
];

export function PaymentsTable({ rows }: { rows: ChannelPaymentRow[] }) {
  return <DataTable columns={columns} data={rows} rowId={(r) => r.id} searchable={false} emptyMessage="Aucun paiement pour ces critères." />;
}
