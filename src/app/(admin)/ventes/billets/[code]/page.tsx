import {
  Armchair, ArrowRight, Buildings, Bus, CalendarBlank, CheckCircle, Clock, CreditCard, Globe, IdentificationCard,
  QrCode, Receipt, Storefront, UserCircle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { ticketStatusBadge } from "@/lib/labels";
import { ticketsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-semibold">{children}</div>
      </div>
    </div>
  );
}

const PAYMENT = { paid: "Payé", pending: "En attente", failed: "Échoué" } as const;

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const detail = ticketsRepo.detailByCode(decodeURIComponent(code));
  if (!detail) notFound();
  const { ticket: t, scanLog } = detail;
  const status = ticketStatusBadge(t.status);
  const [from, to] = t.routeLabel.split(" → ");
  const online = t.channel === "online";
  return (
    <>
      <PageHeader
        title={`Billet ${t.ticketCode}`}
        description={`${t.passengerName} · ${t.companyName}`}
        actions={<span data-testid="ticket-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="mb-6 overflow-hidden rounded-2xl bg-card shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-6 p-6">
          <div className="min-w-0">
            <p className="flex items-center gap-3 text-3xl font-extrabold tracking-tight">{from}<ArrowRight size={26} weight="bold" aria-hidden className="text-accent" />{to}</p>
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground"><CalendarBlank size={18} weight="duotone" aria-hidden />{t.departure ? formatDateTime(t.departure) : "Départ inconnu"}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Montant du billet</p>
            <p className="text-3xl font-extrabold tabular-nums" data-testid="ticket-amount">{formatMoney(t.amount, t.currency)}</p>
            <p className="mt-1 text-sm font-medium text-muted-foreground">{PAYMENT[t.paymentStatus]}</p>
          </div>
        </div>
      </div>
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Info icon={UserCircle} label="Voyageur">{t.passengerName}</Info>
        <Info icon={Armchair} label="Siège">{t.seatNumber ?? "—"}</Info>
        <Info icon={Bus} label="Bus">{t.busPlate}</Info>
        <Info icon={Buildings} label="Compagnie">{t.companyName}</Info>
        <Info icon={Receipt} label="Réservation"><Link href={`/ventes/reservations/${t.bookingId}`} className="hover:underline">{t.bookingCode}</Link></Info>
        <Info icon={online ? Globe : Storefront} label="Canal de vente">{online ? "En ligne" : "Guichet"}</Info>
        <Info icon={Clock} label="Émis le">{formatDateTime(t.issuedAt)}</Info>
        <Info icon={CreditCard} label="Paiement">{PAYMENT[t.paymentStatus]}</Info>
      </div>
      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><QrCode size={20} weight="duotone" aria-hidden />Scans à l'embarquement</CardTitle></CardHeader>
        <CardContent>
          {scanLog.length === 0 ? <p className="text-sm text-muted-foreground">Ce billet n'a pas encore été scanné.</p> : (
            <ul data-testid="ticket-scans" className="divide-y divide-border">
              {scanLog.map((s, i) => (
                <li key={`${s.at}-${i}`} className="flex items-center gap-3 py-3 text-sm">
                  <CheckCircle size={22} weight="duotone" aria-hidden className="shrink-0 text-lime-600" />
                  <span className="font-semibold tabular-nums">{formatDateTime(s.at)}</span>
                  <span className="ml-auto inline-flex items-center gap-1.5 text-muted-foreground">
                    <IdentificationCard size={16} weight="duotone" aria-hidden />Scanné par{" "}
                    {s.byId && s.byName
                      ? <Link href={`/flotte/equipage/${s.byId}`} className="font-medium text-foreground hover:underline">{s.byName}</Link>
                      : <span className="font-medium text-foreground">un contrôleur inconnu</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </>
  );
}
