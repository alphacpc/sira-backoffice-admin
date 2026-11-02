"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle, Receipt, Stack, XCircle } from "@phosphor-icons/react/dist/ssr";
import { DataTable } from "@/components/data/data-table";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate, formatMoney } from "@/lib/format";
import type { PlanInvoiceRow } from "@/lib/repos/billing-hub";
import { InvoiceModalLink } from "./invoice-modal-link";
import { ResendInvoiceButton } from "./resend-invoice-button";

const STATUS = {
  paid: { label: "Payée", cls: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300", icon: CheckCircle },
  failed: { label: "Échouée", cls: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", icon: XCircle },
} as const;

const columns: ColumnDef<PlanInvoiceRow, unknown>[] = [
  {
    accessorKey: "number", header: "Facture",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground"><Receipt size={18} weight="duotone" aria-hidden /></span>
        <div className="min-w-0">
          <InvoiceModalLink invoiceId={row.original.id} number={row.original.number} />
          <p className="text-xs text-muted-foreground">Émise le {formatDate(row.original.issuedAt)}</p>
        </div>
      </div>
    ),
  },
  {
    accessorKey: "companyName", header: "Client",
    cell: ({ row }) => (
      <div className="flex items-center gap-3">
        <CompanyAvatar name={row.original.companyName} />
        <span className="font-semibold">{row.original.companyName}</span>
      </div>
    ),
  },
  {
    accessorKey: "planName", header: "Offre",
    cell: ({ row }) => (row.original.planName
      ? <span className="inline-flex items-center gap-2 font-bold"><Stack size={18} weight="duotone" aria-hidden className="text-accent" />{row.original.planName}</span>
      : <span className="text-muted-foreground">—</span>),
  },
  {
    accessorKey: "amount", header: "Montant",
    cell: ({ row }) => <span className="text-base font-bold tabular-nums">{formatMoney(row.original.amount, row.original.currency)}</span>,
  },
  {
    accessorKey: "status", header: "Statut",
    cell: ({ row }) => {
      const st = STATUS[row.original.status];
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium ${st.cls}`}>
          <st.icon size={14} weight="fill" aria-hidden />{st.label}
        </span>
      );
    },
  },
  {
    id: "action", header: "Action", enableSorting: false, meta: { align: "center" },
    cell: ({ row }) => (
      <div className="flex items-start justify-center gap-2">
        <InvoiceModalLink invoiceId={row.original.id} number={row.original.number} variant="button" />
        <ResendInvoiceButton row={row.original} />
      </div>
    ),
  },
];

export function InvoicesList({ rows }: { rows: PlanInvoiceRow[] }) {
  return <DataTable columns={columns} data={rows} rowId={(r) => r.id} searchable={false} emptyMessage="Aucune facture pour ces critères." />;
}

/** Totals of the invoices currently shown. */
export function InvoicesSummary({ rows }: { rows: PlanInvoiceRow[] }) {
  const paid = rows.filter((r) => r.status === "paid");
  const failed = rows.filter((r) => r.status === "failed");
  const sum = (l: PlanInvoiceRow[]) => l.reduce((n, r) => n + r.amount, 0);
  const currency = rows[0]?.currency ?? "XOF";
  const items = [
    { label: "Factures", value: String(rows.length), sub: "affichées", dot: "bg-slate-400" },
    { label: "Encaissé", value: formatMoney(sum(paid), currency), sub: `${paid.length} payée${paid.length > 1 ? "s" : ""}`, dot: "bg-lime-500" },
    { label: "En échec", value: formatMoney(sum(failed), currency), sub: `${failed.length} échouée${failed.length > 1 ? "s" : ""}`, dot: "bg-rose-500" },
    { label: "Total facturé", value: formatMoney(sum(rows), currency), sub: "toutes confondues", dot: "bg-orange-500" },
  ];
  return (
    <section aria-label="Totaux" className="mb-5 grid divide-border overflow-hidden rounded-2xl bg-white shadow-card dark:bg-card sm:grid-cols-2 sm:divide-x xl:grid-cols-4">
      {items.map((i) => (
        <div key={i.label} className="border-b border-border p-5 last:border-b-0 sm:border-b-0">
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><span aria-hidden className={`size-2 rounded-full ${i.dot}`} />{i.label}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight tabular-nums">{i.value}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{i.sub}</p>
        </div>
      ))}
    </section>
  );
}
