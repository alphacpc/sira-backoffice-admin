"use client";

import {
  ArrowRight, Armchair, CheckCircle, CursorClick, Hourglass, IdentificationCard, QrCode, ShieldCheck, Storefront, Ticket, User, Users,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { useState } from "react";
import { StatusBadge, type Tone } from "@/components/data/status-badge";
import { SeatMap } from "@/components/fleet/seat-map";
import { formatDateTime } from "@/lib/format";
import { seatStateLabel } from "@/lib/labels";
import type { SeatMapView, SeatOccupant } from "@/lib/repos/fleet";
import { cn } from "@/lib/utils";

const TICKET_LABEL: Record<string, { label: string; tone: Tone }> = {
  ISSUED: { label: "Émis", tone: "info" },
  CHECKED_IN: { label: "Embarqué", tone: "success" },
  USED: { label: "Utilisé", tone: "success" },
  CANCELLED: { label: "Annulé", tone: "neutral" },
};
const PAYMENT_LABEL = {
  paid: { label: "Payée", tone: "success" },
  pending: { label: "Paiement en attente", tone: "warning" },
  failed: { label: "Paiement échoué", tone: "danger" },
} as const;

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");
const link = "text-accent-text hover:underline";

function Stat({ icon: Icon, value, label }: { icon: typeof Users; value: number; label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border px-4 py-3">
      <Icon size={24} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
      <div>
        <p className="text-xl font-bold tabular-nums leading-none">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}

function PassengerName({ occ }: { occ: SeatOccupant }) {
  const href = occ.customerId ? `/clients/comptes/${occ.customerId}` : occ.userId ? `/utilisateurs/${occ.userId}` : null;
  return href ? <Link href={href} className={cn("font-semibold", link)}>{occ.passengerName}</Link> : <span className="font-semibold">{occ.passengerName}</span>;
}

/**
 * Seat map of a trip: click a seat (or a row of the passenger list) to see the passenger, the ticket as a
 * boarding pass and the control timeline, with links to the client, the booking, the ticket and the controller.
 */
export function TripSeatExplorer({
  map, seats, routeLabel, departure,
}: { map: SeatMapView; seats: Record<string, SeatOccupant>; routeLabel: string; departure: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const seat = selected ? map.seats.find((s) => s.code === selected) : null;
  const occ = selected ? seats[selected] : undefined;

  const all = Object.entries(seats).sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
  const controlled = all.filter(([, o]) => (o.ticket?.scans.length ?? 0) > 0).length;
  const toControl = all.filter(([, o]) => o.ticket && o.ticket.scans.length === 0 && o.ticket.status !== "CANCELLED").length;

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat icon={Users} value={all.length} label="Passagers" />
        <Stat icon={Ticket} value={all.filter(([, o]) => o.ticket).length} label="Billets émis" />
        <Stat icon={ShieldCheck} value={controlled} label="Billets contrôlés" />
        <Stat icon={Hourglass} value={toControl} label="À contrôler" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[auto_minmax(0,1fr)]">
        <SeatMap map={map} selected={selected} onSelect={setSelected} />

        <aside aria-live="polite" data-testid="seat-panel" className="min-w-0 overflow-hidden rounded-2xl border border-border">
          {!seat ? (
            <div className="flex h-full min-h-64 flex-col items-center justify-center gap-2 p-8 text-center text-sm text-muted-foreground">
              <CursorClick size={36} weight="duotone" aria-hidden className="text-orange-500" />
              <p className="font-medium text-foreground">Choisis un siège</p>
              Clique sur le plan ou dans la liste des passagers pour voir l&apos;occupant, son billet et le contrôle.
            </div>
          ) : (
            <>
              <header className="flex items-center gap-3 border-b border-border bg-muted/50 px-5 py-4">
                <Armchair size={32} weight="duotone" aria-hidden className="text-orange-500" />
                <div className="flex-1">
                  <p className="text-lg font-bold leading-tight">Siège {seat.code}</p>
                  <p className="text-xs text-muted-foreground">{routeLabel} · {formatDateTime(departure)}</p>
                </div>
                <StatusBadge tone={seat.state === "free" ? "success" : seat.state === "blocked" ? "neutral" : seat.state === "booked" ? "warning" : "info"}>
                  {seatStateLabel(seat.state)}
                </StatusBadge>
              </header>

              {!occ ? (
                <p className="p-6 text-sm text-muted-foreground">
                  {seat.state === "blocked" ? "Siège bloqué : il ne peut pas être vendu." : "Aucune réservation sur ce siège."}
                </p>
              ) : (
                <div className="space-y-6 p-5">
                  <section className="flex items-center gap-4">
                    <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-orange-500 text-lg font-bold text-orange-500">
                      {initials(occ.passengerName)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xl leading-tight"><PassengerName occ={occ} /></p>
                      <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                        {occ.channel === "online"
                          ? <><User size={16} weight="duotone" aria-hidden className="text-orange-500" />Réservé en ligne</>
                          : <><Storefront size={16} weight="duotone" aria-hidden className="text-orange-500" />Vente au guichet, sans compte</>}
                      </p>
                    </div>
                    {(occ.customerId || occ.userId) && (
                      <Link href={occ.customerId ? `/clients/comptes/${occ.customerId}` : `/utilisateurs/${occ.userId}`} className={cn("inline-flex shrink-0 items-center gap-1 text-sm font-medium", link)}>
                        Fiche <ArrowRight size={14} aria-hidden />
                      </Link>
                    )}
                  </section>

                  <section aria-label="Billet" className="relative flex overflow-hidden rounded-xl border border-border">
                    <div className="min-w-0 flex-1 space-y-2 p-4">
                      <p className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        <Ticket size={16} weight="duotone" aria-hidden className="text-orange-500" />Billet
                      </p>
                      {occ.ticket ? (
                        <>
                          <Link href={`/ventes/billets/${occ.ticket.code}`} className={cn("block font-mono text-lg font-bold", link)}>{occ.ticket.code}</Link>
                          <div className="flex flex-wrap items-center gap-2">
                            <StatusBadge tone={TICKET_LABEL[occ.ticket.status]?.tone ?? "neutral"}>{TICKET_LABEL[occ.ticket.status]?.label ?? occ.ticket.status}</StatusBadge>
                            <StatusBadge tone={PAYMENT_LABEL[occ.paymentStatus].tone}>{PAYMENT_LABEL[occ.paymentStatus].label}</StatusBadge>
                          </div>
                          <p className="text-xs text-muted-foreground">Émis le {formatDateTime(occ.ticket.issuedAt)}</p>
                        </>
                      ) : (
                        <>
                          <p className="text-sm text-muted-foreground">Aucun billet émis.</p>
                          <StatusBadge tone={PAYMENT_LABEL[occ.paymentStatus].tone}>{PAYMENT_LABEL[occ.paymentStatus].label}</StatusBadge>
                        </>
                      )}
                    </div>
                    <div aria-hidden className="w-0 self-stretch border-l-2 border-dashed border-border" />
                    <Link href={`/ventes/reservations/${occ.bookingId}`} className="flex w-32 shrink-0 flex-col items-center justify-center gap-1.5 p-3 text-center transition hover:bg-muted">
                      <QrCode size={36} weight="duotone" aria-hidden className="text-orange-500" />
                      <span className="font-mono text-[11px] text-muted-foreground">{occ.bookingCode}</span>
                      <span className="text-xs font-medium text-accent-text">Réservation</span>
                    </Link>
                  </section>

                  <section aria-label="Contrôle">
                    <h4 className="mb-3 flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      <ShieldCheck size={16} weight="duotone" aria-hidden className="text-orange-500" />Contrôle sur ce trajet
                    </h4>
                    {!occ.ticket || occ.ticket.scans.length === 0 ? (
                      <p className="flex items-center gap-2 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">
                        <Hourglass size={20} weight="duotone" aria-hidden className="text-orange-500" />Billet pas encore contrôlé.
                      </p>
                    ) : (
                      <ol className="relative ml-2 space-y-4 border-l border-border pl-6">
                        {occ.ticket.scans.map((sc, i) => (
                          <li key={`${sc.at}-${i}`} className="relative">
                            <CheckCircle size={20} weight="fill" aria-hidden className="absolute -left-[34px] top-0 bg-card text-orange-500" />
                            <p className="text-sm font-semibold">Billet contrôlé</p>
                            <p className="mt-0.5 flex items-center gap-1.5 text-sm">
                              <IdentificationCard size={16} weight="duotone" aria-hidden className="text-orange-500" />
                              {sc.controllerId && sc.controllerName
                                ? <Link href={`/flotte/equipage/${sc.controllerId}`} className={cn("font-medium", link)}>{sc.controllerName}</Link>
                                : <span className="text-muted-foreground">Contrôleur inconnu</span>}
                              <span className="text-xs text-muted-foreground">· Contrôleur</span>
                            </p>
                            <p className="text-xs tabular-nums text-muted-foreground">{formatDateTime(sc.at)}</p>
                          </li>
                        ))}
                      </ol>
                    )}
                  </section>
                </div>
              )}
            </>
          )}
        </aside>
      </div>

      <section aria-label="Liste des passagers">
        <h4 className="mb-3 text-sm font-semibold">Liste des passagers ({all.length})</h4>
        {all.length === 0 ? <p className="text-sm text-muted-foreground">Aucun passager sur ce trajet.</p> : (
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr><th className="px-4 py-2.5 font-medium">Siège</th><th className="px-4 py-2.5 font-medium">Passager</th><th className="px-4 py-2.5 font-medium">Billet</th><th className="px-4 py-2.5 font-medium">Contrôle</th></tr>
              </thead>
              <tbody className="divide-y divide-border">
                {all.map(([code, o]) => {
                  const last = o.ticket?.scans.at(-1);
                  const t = o.ticket ? TICKET_LABEL[o.ticket.status] : null;
                  return (
                    <tr key={code} onClick={() => setSelected(code)} className={cn("cursor-pointer transition-colors hover:bg-muted/60", selected === code && "bg-orange-50 dark:bg-orange-400/10")}>
                      <td className="px-4 py-2.5">
                        <button type="button" onClick={() => setSelected(code)} className="inline-flex items-center gap-2 font-semibold" aria-label={`Voir le siège ${code}`}>
                          <Armchair size={18} weight="duotone" aria-hidden className="text-orange-500" />{code}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">{o.passengerName}</td>
                      <td className="px-4 py-2.5">{t ? <StatusBadge tone={t.tone}>{t.label}</StatusBadge> : <span className="text-muted-foreground">—</span>}</td>
                      <td className="px-4 py-2.5 text-muted-foreground">
                        {last ? <>{last.controllerName ?? "Contrôleur inconnu"} · {formatDateTime(last.at)}</> : "Pas contrôlé"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
