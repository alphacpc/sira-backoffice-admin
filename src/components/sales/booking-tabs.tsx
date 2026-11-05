import { Buildings, Bus, CalendarBlank, Chair, MapPin, Storefront, Ticket, User, XCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { formatDateTime, formatMoney } from "@/lib/format";
import {
  bookingPaymentBadge, bookingStatusBadge, cancelReasonLabel, channelLabel, ticketStatusBadge, transactionStatusBadge,
} from "@/lib/labels";
import type { BookingDetail } from "@/lib/repos/sales";

const TAB_VALUES = ["resume", "chronologie", "paiements", "billets"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-semibold">{children}</div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function BookingTabs({ detail, initialTab }: { detail: BookingDetail; initialTab?: string }) {
  const { booking: b } = detail;
  const status = bookingStatusBadge(b.status);
  const payment = bookingPaymentBadge(b.paymentStatus);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Panel title="Vue d'ensemble">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 p-5">
            <Ticket size={36} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="font-mono text-lg font-bold">{b.bookingCode}</p>
              <p className="text-sm text-muted-foreground">{b.passengerName} · {channelLabel(b.channel)}</p>
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <StatusBadge tone={payment.tone}>{payment.label}</StatusBadge>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(b.amount, b.currency)}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${b.companyId}`} className="hover:underline">{detail.companyName}</Link></Info>
            <Info icon={User} label="Passager">{b.userId ? <Link href={`/utilisateurs/${b.userId}`} className="hover:underline">{b.passengerName}</Link> : b.passengerName}</Info>
            <Info icon={Storefront} label="Canal">{channelLabel(b.channel)}</Info>
            <Info icon={MapPin} label="Trajet"><Link href={`/flotte/trajets/${b.tripId}`} className="hover:underline">{detail.routeLabel}</Link><p className="text-xs font-normal text-muted-foreground">{formatDateTime(detail.departure)}</p></Info>
            <Info icon={Bus} label="Bus">{detail.busPlate}</Info>
            <Info icon={Chair} label="Siège">{b.seatNumber ?? "—"}</Info>
            <Info icon={Ticket} label="Billet émis">{b.ticketIssued ? "Oui" : "Non"}</Info>
            <Info icon={CalendarBlank} label="Créée le">{formatDateTime(b.createdAt)}</Info>
            <Info icon={XCircle} label="Annulation">{b.cancelledAt ? `${formatDateTime(b.cancelledAt)}${b.cancelReason ? ` · ${cancelReasonLabel(b.cancelReason)}` : ""}` : "—"}</Info>
          </div>
        </Panel>
      ),
    },
    {
      value: "chronologie", label: "Chronologie",
      content: (
        <Panel title={`Chronologie (${detail.timeline.length})`}>
          <ol className="relative ml-2 space-y-5 border-l border-border pl-6">
            {detail.timeline.map((e, i) => (
              <li key={`${e.at}-${i}`} className="relative text-sm">
                <span aria-hidden className="absolute -left-[31px] top-1.5 size-2.5 rounded-full bg-orange-500 ring-4 ring-card" />
                <p className="font-medium">{e.label}</p>
                <p className="text-xs text-muted-foreground tabular-nums">{formatDateTime(e.at)}</p>
              </li>
            ))}
          </ol>
        </Panel>
      ),
    },
    {
      value: "paiements", label: "Paiements",
      content: (
        <Panel title={`Paiements (${detail.transactions.length})`}>
          {detail.transactions.length === 0 ? <Empty>Aucun paiement pour cette réservation.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Référence</th>
                  <th className={TH}>Moyen</th>
                  <th className={TH}>Montant</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Lancé le</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.transactions.map((t) => {
                  const badge = transactionStatusBadge(t.status);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/ventes/paiements/${t.id}`} className="font-medium hover:underline">{t.reference}</Link>
                      </td>
                      <td>{t.methodName}</td>
                      <td className="tabular-nums">{formatMoney(t.amount, t.currency)}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td>{formatDateTime(t.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      ),
    },
    {
      value: "billets", label: "Billets",
      content: (
        <Panel title={`Billets (${detail.tickets.length})`}>
          {detail.tickets.length === 0 ? <Empty>Aucun billet émis pour cette réservation.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Siège</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Émis le</th>
                  <th className={TH}>Scans</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.tickets.map((t) => {
                  const badge = ticketStatusBadge(t.status);
                  return (
                    <tr key={t.id}>
                      <td>
                        <Link href={`/ventes/billets/${t.ticketCode}`} className="font-medium hover:underline">{t.ticketCode}</Link>
                      </td>
                      <td>{t.seatNumber ?? "—"}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td>{formatDateTime(t.issuedAt)}</td>
                      <td className="tabular-nums">{t.scanCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
