"use client";

import { Check, Copy, CreditCard, PaintBrush, Printer } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { payRentalInvoice } from "@/app/(admin)/ventes/actions";
import { Button } from "@/components/ui/button";

export interface InvoiceActionsProps { number: string; payLink: string; canPay: boolean; balanceLabel: string; templateHref: string }

export function InvoiceActions(p: InvoiceActionsProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function copy() {
    try { await navigator.clipboard.writeText(p.payLink); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError("Copie impossible : sélectionnez le lien à la main"); }
  }
  async function pay() {
    setBusy(true); setError(null);
    const r = await payRentalInvoice(p.number);
    setBusy(false);
    if (!r.ok) setError(r.error);
    router.refresh();
  }
  return (
    <div className="space-y-3 print:hidden">
      {error && <p role="alert" data-testid="invoice-error" className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-medium text-rose-800">{error}</p>}
      {p.canPay && (
        <Button className="w-full" disabled={busy} onClick={() => void pay()} data-testid="invoice-pay">
          <CreditCard size={18} weight="duotone" aria-hidden />Payer {p.balanceLabel}
        </Button>
      )}
      <Button variant="secondary" className="w-full" onClick={() => void copy()}>
        {copied ? <Check size={18} aria-hidden /> : <Copy size={18} aria-hidden />}{copied ? "Lien copié" : "Copier le lien de paiement"}
      </Button>
      <Button variant="secondary" className="w-full" onClick={() => window.print()}><Printer size={18} aria-hidden />Imprimer ou enregistrer en PDF</Button>
      <Link href={p.templateHref} className="flex h-10 w-full items-center justify-center gap-2 rounded-lg border border-border bg-card text-sm font-medium hover:bg-muted">
        <PaintBrush size={18} aria-hidden />Personnaliser le modèle
      </Link>
      {p.canPay && <p className="text-xs text-muted-foreground">Le bouton « Payer » simule le règlement du client par le lien de paiement et solde la facture.</p>}
    </div>
  );
}
