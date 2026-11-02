"use client";

import {
  ArrowSquareOut, Check, CheckCircle, Copy, Eye, FileText, Receipt, WarningCircle, X, XCircle,
} from "@phosphor-icons/react/dist/ssr";
import * as RadixDialog from "@radix-ui/react-dialog";
import Link from "next/link";
import { useState } from "react";
import { getInvoicePreview, type InvoicePreview } from "@/app/(admin)/facturation/actions";
import { Logo } from "@/components/shell/logo";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/** End of the period covered by the invoice (one month or one year after the issue date, minus a day). */
function periodEnd(issuedAt: string, cycle: "MONTHLY" | "YEARLY" | null): string {
  const d = new Date(issuedAt);
  if (cycle === "YEARLY") d.setUTCFullYear(d.getUTCFullYear() + 1);
  else d.setUTCMonth(d.getUTCMonth() + 1);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString();
}

function Step({ icon: Icon, tone, title, when, last }: {
  icon: typeof Check; tone: "done" | "failed" | "idle"; title: string; when?: string | null; last?: boolean;
}) {
  const color = tone === "done" ? "bg-lime-500 text-white" : tone === "failed" ? "bg-rose-500 text-white" : "bg-muted text-muted-foreground";
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-px bg-border" />}
      <span className={cn("z-10 flex size-8 shrink-0 items-center justify-center rounded-full", color)}><Icon size={16} weight="bold" aria-hidden /></span>
      <div className="pt-0.5">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{when ?? "—"}</p>
      </div>
    </li>
  );
}

/** Invoice number that opens a payment-platform style invoice in a modal, without leaving the page. */
export function InvoiceModalLink({ invoiceId, number, variant = "link" }: { invoiceId: string; number: string; variant?: "link" | "button" }) {
  const [open, setOpen] = useState(false);
  const [invoice, setInvoice] = useState<InvoicePreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function show() {
    setOpen(true);
    setInvoice(null);
    setError(null);
    try {
      const r = await getInvoicePreview(invoiceId);
      if (r.ok) setInvoice(r.invoice);
      else setError(r.error);
    } catch {
      setError("Impossible de charger la facture");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(number);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard unavailable */
    }
  }

  const paid = invoice?.status === "paid";
  return (
    <>
      {variant === "button" ? (
        <button type="button" onClick={show} aria-label={`Voir la facture ${number}`} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-sm font-medium transition-colors hover:bg-muted">
          <Eye size={16} weight="duotone" aria-hidden /> Voir
        </button>
      ) : (
        <button type="button" onClick={show} className="font-medium text-accent-text hover:underline">{number}</button>
      )}
      <RadixDialog.Root open={open} onOpenChange={setOpen}>
        <RadixDialog.Portal>
          <RadixDialog.Overlay className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
          <RadixDialog.Content
            aria-describedby={undefined}
            className="fixed left-1/2 top-1/2 z-50 max-h-[92vh] w-[calc(100%-2rem)] max-w-4xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-3xl bg-card shadow-2xl outline-none"
          >
            <RadixDialog.Title className="sr-only">Facture {number}</RadixDialog.Title>
            <RadixDialog.Close aria-label="Fermer" className="absolute right-4 top-4 z-20 flex size-9 items-center justify-center rounded-full bg-black/5 text-foreground hover:bg-black/10 md:bg-white/10 md:text-white md:hover:bg-white/20">
              <X size={18} aria-hidden />
            </RadixDialog.Close>

            {error && <p role="alert" className="p-10 text-sm text-danger">{error}</p>}
            {!invoice && !error && <p className="p-10 text-sm text-muted-foreground">Chargement de la facture…</p>}

            {invoice && (
              <article aria-label={`Facture ${invoice.number}`} className="grid md:grid-cols-[19rem_1fr]">
                {/* Résumé */}
                <aside className="relative flex flex-col overflow-hidden bg-gradient-to-b from-[#292524] to-[#1c1917] p-7 text-white">
                  <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-[#ea580c]/25 blur-3xl" />
                  <Logo onDark height={36} className="relative -ml-1 self-start" />

                  <p className="relative mt-10 text-xs uppercase tracking-widest text-white/60">Montant {paid ? "réglé" : "dû"}</p>
                  <p className="relative mt-1 text-4xl font-extrabold tracking-tight tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</p>
                  <span className={cn("relative mt-4 inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-sm font-medium", paid ? "bg-lime-400/20 text-lime-300" : "bg-rose-400/20 text-rose-300")}>
                    {paid ? <CheckCircle size={16} weight="fill" aria-hidden /> : <XCircle size={16} weight="fill" aria-hidden />}
                    {paid ? "Payée" : "Paiement échoué"}
                  </span>

                  <dl className="relative mt-8 space-y-4 text-sm">
                    <div><dt className="text-white/60">Facture</dt><dd className="font-semibold tabular-nums">{invoice.number}</dd></div>
                    <div><dt className="text-white/60">Émise le</dt><dd className="font-semibold">{formatDate(invoice.issuedAt)}</dd></div>
                    <div>
                      <dt className="text-white/60">Facturée à</dt>
                      <dd className="mt-1 flex items-center gap-2.5 font-semibold">
                        <CompanyAvatar name={invoice.companyName} size="sm" />{invoice.companyName}
                      </dd>
                    </div>
                  </dl>
                </aside>

                {/* Détail */}
                <div className="flex flex-col p-7 md:pt-8">
                  <div className="flex items-center gap-2 text-sm font-semibold"><Receipt size={18} weight="duotone" aria-hidden className="text-accent" /> Détail de la facture</div>

                  <div className="mt-4 overflow-hidden rounded-2xl border border-border">
                    <div className="flex items-start justify-between gap-4 p-4">
                      <div>
                        <p className="font-semibold">Abonnement {invoice.planName ?? "Sira"}</p>
                        <p className="mt-0.5 text-sm text-muted-foreground">
                          {invoice.billingCycle === "YEARLY" ? "Facturation annuelle" : "Facturation mensuelle"} · du {formatDate(invoice.issuedAt)} au {formatDate(periodEnd(invoice.issuedAt, invoice.billingCycle))}
                        </p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</p>
                    </div>
                    <div className="space-y-2 border-t border-border bg-muted/40 p-4 text-sm">
                      <div className="flex justify-between text-muted-foreground"><span>Sous-total</span><span className="tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</span></div>
                      <div className="flex items-center justify-between border-t border-border pt-2 text-base font-bold"><span>Total</span><span className="tabular-nums">{formatMoney(invoice.amount, invoice.currency)}</span></div>
                      <div className="flex justify-between text-muted-foreground"><span>{paid ? "Montant payé" : "Reste à payer"}</span><span className={cn("font-semibold tabular-nums", paid ? "text-lime-600" : "text-rose-500")}>{formatMoney(invoice.amount, invoice.currency)}</span></div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <h3 className="mb-3 text-sm font-semibold">Historique</h3>
                    <ol>
                      <Step icon={FileText} tone="done" title="Facture émise" when={formatDateTime(invoice.issuedAt)} />
                      <Step
                        icon={invoice.paymentStatus === "failed" ? WarningCircle : Check}
                        tone={invoice.paymentStatus === "paid" ? "done" : invoice.paymentStatus === "failed" ? "failed" : "idle"}
                        title={invoice.paymentStatus === "paid" ? "Paiement reçu" : invoice.paymentStatus === "failed" ? "Paiement refusé" : "Paiement en attente"}
                        when={invoice.paymentAt ? formatDateTime(invoice.paymentAt) : "Aucune tentative enregistrée"} last
                      />
                    </ol>
                  </div>

                  <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-5 md:mt-8">
                    <button type="button" onClick={copy} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
                      {copied ? <Check size={16} weight="bold" aria-hidden className="text-lime-600" /> : <Copy size={16} aria-hidden />}
                      {copied ? "Copié" : "Copier le numéro"}
                    </button>
                    <Link href={`/facturation/factures/${invoice.id}`} className="inline-flex h-10 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted">
                      <ArrowSquareOut size={16} aria-hidden /> Ouvrir la page
                    </Link>
                    {invoice.subscriptionId && (
                      <Link href={`/facturation/abonnements/${invoice.subscriptionId}`} className="inline-flex h-10 items-center gap-2 rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground hover:opacity-90">
                        Voir l&apos;abonnement
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            )}
          </RadixDialog.Content>
        </RadixDialog.Portal>
      </RadixDialog.Root>
    </>
  );
}
