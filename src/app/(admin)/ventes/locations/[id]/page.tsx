import {
  Armchair, ArrowRight, FileText, Buildings, Bus, CalendarBlank, Clock, CreditCard, IdentificationCard, MapPin, Phone, Path, Receipt,
  ShieldCheck, Target, UserCircle, Users, Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { RentalActions } from "@/components/sales/rental-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { INVOICE_STATUS, rentalInvoicesRepo } from "@/lib/repos/rental-invoices";
import { RENTAL_PURPOSES, rentalsRepo } from "@/lib/repos/rentals";

export const dynamic = "force-dynamic";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;
function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><div className="mt-0.5 text-sm font-semibold">{children}</div></div>
    </div>
  );
}

const STATUS = {
  REQUESTED: { label: "Demande", tone: "warning" }, QUOTED: { label: "Devis envoyé", tone: "info" }, CONFIRMED: { label: "Confirmée", tone: "success" },
  COMPLETED: { label: "Terminée", tone: "neutral" }, CANCELLED: { label: "Annulée", tone: "danger" },
} as const;
const PAYMENT = { none: "Aucun paiement", deposit: "Acompte versé", settled: "Soldée" } as const;

export default async function RentalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // Not wired to the platform yet: never look a live id up in the demonstration store.
  if (isLive()) notFound();
  const d = rentalsRepo.detail(id);
  if (!d) notFound();
  const { rental: r } = d;
  const st = STATUS[r.status];
  const money = (n: number) => formatMoney(n, r.currency);
  const invoice = r.invoiceNumber ? rentalInvoicesRepo.byNumber(r.invoiceNumber) : undefined;
  return (
    <>
      <PageHeader
        title={`Location ${r.rentalCode}`} description={`${r.customerName} · ${r.companyName}`}
        actions={<span data-testid="rental-status"><StatusBadge tone={st.tone}>{st.label}</StatusBadge></span>}
      />
      {r.conflicts.length > 0 && (
        <p role="alert" data-testid="rental-conflict" className="mb-5 flex items-center gap-2 rounded-xl bg-rose-100 px-4 py-3 text-sm font-medium text-rose-800 dark:bg-rose-400/15 dark:text-rose-300">
          <Warning size={18} weight="fill" aria-hidden />Le bus ou le chauffeur est aussi pris par {r.conflicts.join(", ")} aux mêmes dates.
        </p>
      )}
      <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">{r.pickup}<ArrowRight size={26} weight="bold" aria-hidden className="text-accent" />{r.destination}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground"><CalendarBlank size={18} weight="duotone" aria-hidden />
              {formatDateTime(r.departure)}{r.returnAt ? ` → retour le ${formatDateTime(r.returnAt)}` : " · aller simple"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Montant du devis</p>
            <p className="text-3xl font-extrabold tabular-nums" data-testid="rental-quote">{r.quoteAmount === null ? "En attente" : money(r.quoteAmount)}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{PAYMENT[r.payment]}</p>
          </div>
        </div>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info icon={UserCircle} label="Client">{r.customerName}</Info>
        <Info icon={Phone} label="Téléphone">{r.customerPhone}</Info>
        <Info icon={Target} label="Motif">{RENTAL_PURPOSES[r.purpose]}</Info>
        <Info icon={Users} label="Passagers">{r.passengers}</Info>
        <Info icon={Bus} label="Bus">{r.busLabel ?? "À affecter"}</Info>
        <Info icon={IdentificationCard} label="Chauffeur">
          {r.driverId && r.driverName ? <Link href={`/flotte/equipage/${r.driverId}`} className="hover:underline">{r.driverName}</Link> : "À affecter"}
        </Info>
        <Info icon={Path} label="Distance estimée">{r.estimatedKm} km</Info>
        <Info icon={Buildings} label="Compagnie">{r.companyName}</Info>
        <Info icon={Receipt} label="Acompte à verser">{r.quoteAmount === null ? "—" : money(r.depositRequired)}</Info>
        <Info icon={CreditCard} label="Déjà payé">{money(r.paidAmount)}</Info>
        <Info icon={Armchair} label="Solde restant">{r.quoteAmount === null ? "—" : money(r.balance)}</Info>
        <Info icon={ShieldCheck} label="Caution">{r.quoteAmount === null ? "—" : money(r.cautionAmount)}</Info>
      </div>
      <Card className="mb-6">
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText size={20} weight="duotone" aria-hidden />Facture</CardTitle></CardHeader>
        <CardContent>
          {invoice ? (
            <div className="flex flex-wrap items-center justify-between gap-4" data-testid="rental-invoice">
              <div>
                <Link href={`/ventes/factures/${invoice.number}`} className="font-mono text-base font-bold hover:underline">{invoice.number}</Link>
                <p className="mt-1 text-sm text-muted-foreground">Total {money(invoice.total)} · reste à payer {money(invoice.balance)}</p>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge tone={INVOICE_STATUS[invoice.status].tone}>{INVOICE_STATUS[invoice.status].label}</StatusBadge>
                <Link href={`/ventes/factures/${invoice.number}`} className="inline-flex h-10 items-center rounded-lg bg-accent px-4 text-sm font-medium text-accent-foreground hover:opacity-90">Ouvrir la facture</Link>
              </div>
            </div>
          ) : <p className="text-sm text-muted-foreground">Aucune facture pour l'instant : elle est émise avec le lien de paiement quand le devis est envoyé.</p>}
        </CardContent>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Actions</CardTitle></CardHeader>
          <CardContent>
            <RentalActions
              key={`${r.status}-${r.paidAmount}-${r.busId}-${r.driverId}`}
              rentalId={r.id} rentalCode={r.rentalCode} currency={r.currency} nextActions={d.nextActions}
              buses={d.buses} drivers={d.drivers} currentBusId={r.busId} currentDriverId={r.driverId} balance={r.balance}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><Clock size={20} weight="duotone" aria-hidden />Historique</CardTitle></CardHeader>
          <CardContent>
            <ol data-testid="rental-history" className="space-y-3">
              {[...d.history].reverse().map((h, i) => (
                <li key={`${h.at}-${i}`} className="flex gap-3 text-sm">
                  <MapPin size={18} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div><p className="font-medium">{h.label}</p><p className="text-xs text-muted-foreground">{formatDateTime(h.at)} · {h.actor}</p></div>
                </li>
              ))}
            </ol>
            {d.payments.length > 0 && (
              <ul className="mt-4 divide-y divide-border border-t border-border text-sm">
                {d.payments.map((p, i) => <li key={`${p.at}-${i}`} className="flex justify-between py-2"><span>{formatDateTime(p.at)}</span><span className="font-semibold tabular-nums">{money(p.amount)}</span></li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
