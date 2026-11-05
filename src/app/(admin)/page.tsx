import {
  ArrowRight, Bus, CreditCard, FileMagnifyingGlass, Timer, CalendarCheck, CheckCircle, Coins, Funnel, MagnifyingGlass, Package, Percent, Receipt, ShieldCheck, Siren, Ticket, Warning,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { ParetoChart, SalesChart } from "@/components/dashboard/pro-charts";
import { FilterSelect } from "@/components/data/filter-select";
import { Pill, type Tone } from "@/components/compliance/hub/pills";
import { ACCENT, BAD, Gauge, Heatmap, INFO, OK, Panel, StatPanel, StateTimeline, VIOLET, WARN } from "@/components/monitoring/hub/primitives";
import { parseFilter } from "@/lib/filters";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { dsrTypeLabel, severityBadge } from "@/lib/labels";
import { DASH_WINDOWS, dashData, type ParetoResult } from "@/lib/repos/dashboard-hub";
import { firstString } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const ATTENTION_ICON: Record<string, ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean }>> = { incidents: Siren, pastdue: Receipt, dsr: ShieldCheck, kyc: FileMagnifyingGlass, expiring: Timer, stuck: CreditCard };
const SEV_BAR: Record<string, string> = { LOW: "#a1a1aa", MEDIUM: WARN, HIGH: ACCENT, CRITICAL: BAD };
const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

function Link2({ href, label }: { href: string; label: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{label} <ArrowRight size={12} aria-hidden /></Link>;
}

/** Plain-language reading of a Pareto: what it tells the reader to do. */
function ParetoNote({ p, noun, action }: { p: ParetoResult; noun: string; action: string }) {
  if (p.items.length === 0) return null;
  return (
    <p className="mt-3 rounded-xl bg-muted/60 p-3 text-xs leading-relaxed text-muted-foreground">
      <b className="text-foreground">{p.vitalFew} {noun}{p.vitalFew > 1 ? "s" : ""}</b> concentrent <b className="text-foreground">80 %</b> du total ; le premier pèse à lui seul <b className="text-foreground">{p.topShare} %</b>. {action}
    </p>
  );
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ jours?: string | string[] }> }) {
  const sp = await searchParams;
  const days = Number(parseFilter(firstString(sp.jours), DASH_WINDOWS.map(String))) || 14;
  const d = dashData(days);
  const k = d.kpis;
  const b = d.base;
  const mon = d.mon;
  const today = new Intl.DateTimeFormat("fr-FR", { dateStyle: "full", timeZone: "UTC" }).format(new Date(b.generatedAt));
  const live = mon.metrics.filter((m) => !m.stale);
  const down = live.filter((m) => m.status !== "healthy").length;
  const spark = (key: "revenue" | "bookings" | "paid") => d.series.map((x) => x[key]);
  const conv = d.funnel.at(-2)?.value && d.funnel[0]!.value ? Math.round((d.funnel[2]!.value / d.funnel[0]!.value) * 100) : null;

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Tableau de bord</h1>
          <p className="mt-1 text-sm text-muted-foreground"><span className="capitalize">{today}</span> · période du {dm(d.from)} au {dm(d.to)}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <FilterSelect label="Période" param="jours" basePath="/" current={days === 14 ? "all" : String(days)}
            options={[{ value: "7", label: "7 jours" }, { value: "all", label: "14 jours" }, { value: "30", label: "30 jours" }]} />
          <form action="/recherche" method="get" role="search" className="relative w-full sm:w-80">
            <label>
              <span className="sr-only">Rechercher dans le backoffice</span>
              <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input name="q" autoComplete="off" placeholder="Rechercher une compagnie, un code…"
                className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
            </label>
          </form>
        </div>
      </header>

      {/* À traiter */}
      <section aria-label="À traiter" className="rounded-2xl bg-white p-5 shadow-card dark:bg-card">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="flex items-center gap-2 text-base font-semibold">
            {b.attention.length === 0 ? <CheckCircle size={22} weight="fill" aria-hidden className="text-lime-600" /> : <Warning size={22} weight="fill" aria-hidden className="text-amber-500" />}
            {b.attention.length === 0 ? "Tout est à jour" : "À traiter maintenant"}
          </p>
          {b.attention.length > 0 && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{b.attention.length} point{b.attention.length > 1 ? "s" : ""} d&apos;attention</span>}
        </div>
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {b.attention.map((a) => {
            const Icon = ATTENTION_ICON[a.key] ?? Warning;
            return (
              <li key={a.key}>
                <Link href={a.href} className="group flex items-center gap-4 rounded-xl border border-border bg-card p-4 transition hover:-translate-y-0.5 hover:shadow-card">
                  <span className={cn("flex shrink-0 items-center justify-center text-orange-500")}><Icon size={30} weight="duotone" aria-hidden /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-3xl font-bold leading-none tracking-tight tabular-nums">{a.count}</p>
                    <p className="mt-1.5 truncate text-sm text-muted-foreground">{a.label}</p>
                  </div>
                  <ArrowRight size={18} aria-hidden className="shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-foreground" />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      {/* Indicateurs */}
      <section aria-label="Indicateurs clés" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatPanel label="Chiffre d'affaires" value={formatNumber(k.revenue)} unit="XOF" delta={k.revenueDelta} hint={`vs ${d.days} j précédents · MRR ${formatMoney(b.kpis.mrr, "XOF")}`} spark={spark("revenue")} icon={Receipt} color={ACCENT} />
        <StatPanel label="Réservations" value={formatNumber(k.bookings)} delta={k.bookingsDelta} hint={`${k.cancelRate ?? 0} % annulées`} spark={spark("bookings")} icon={CalendarCheck} color={INFO} />
        <StatPanel label="Taux de paiement" value={k.paymentRate === null ? "—" : `${k.paymentRate}`} unit="%" delta={k.paymentRateDelta} hint="réservations payées / confirmées" spark={spark("paid")} icon={Percent} color={OK} tone={k.paymentRate !== null && k.paymentRate < 70 ? "warn" : undefined} />
        <StatPanel label="Panier moyen" value={formatNumber(k.avgBasket)} unit="XOF" delta={k.avgBasketDelta} hint={`${formatNumber(b.kpis.activeCompanies)} compagnies actives sur ${b.kpis.totalCompanies}`} icon={Coins} color={VIOLET} />
        <StatPanel label="Remplissage des départs" value={k.occupancy === null ? "—" : `${k.occupancy}`} unit="%" hint="sièges réservés sur les prochains trajets" icon={Bus} color={ACCENT} />
        <StatPanel label="Livraison des colis" value={k.deliveryRate === null ? "—" : `${k.deliveryRate}`} unit="%" hint={`${b.kpis.parcelsInTransit} en circulation · ${d.parcels.late} en retard`} icon={Package} color={INFO} tone={d.parcels.late > 0 ? "warn" : undefined} />
        <StatPanel label="Disponibilité API" value={mon.api.totals.availability.toFixed(2)} unit="%" hint={`${live.length - down}/${live.length} services opérationnels`} spark={mon.api.byDay.map((x) => 100 - x.err5)} icon={ShieldCheck} color={mon.api.totals.availability >= 99.5 ? OK : BAD} tone={down ? "warn" : undefined} />
        <StatPanel label="Incidents ouverts" value={String(mon.incidents.open)} hint={mon.incidents.mttrMinutes === null ? "aucun résolu" : `MTTR ${mon.incidents.mttrMinutes < 60 ? `${mon.incidents.mttrMinutes} min` : `${Math.round(mon.incidents.mttrMinutes / 60)} h`}`} icon={Siren} color={mon.incidents.open ? BAD : OK} tone={mon.incidents.open ? "bad" : undefined} />
      </section>

      {/* Ventes */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Activité commerciale" subtitle="Chiffre d'affaires (XOF), réservations et réservations payées par jour" right={<Link2 href="/ventes/reservations" label="Réservations" />}>
          <SalesChart data={d.series} />
        </Panel>
        <Panel title="Entonnoir de conversion" subtitle="De la réservation au billet émis" right={<Funnel size={20} weight="duotone" aria-hidden className="text-muted-foreground" />}>
          <ul className="space-y-3">
            {d.funnel.map((f, i) => (
              <li key={f.label}>
                <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{f.label}</span><span className="tabular-nums"><b>{formatNumber(f.value)}</b>{f.ratePct !== null && <span className="ml-2 text-xs text-muted-foreground">{f.ratePct} %</span>}</span></div>
                <div className="mt-1.5 h-6 rounded-lg bg-muted/70"><div className="h-full rounded-lg" style={{ width: `${d.funnel[0]!.value ? Math.max(3, (f.value / d.funnel[0]!.value) * 100) : 0}%`, background: [INFO, VIOLET, OK, ACCENT][i] }} /></div>
              </li>
            ))}
          </ul>
          <p className="mt-4 rounded-xl bg-muted/60 p-3 text-xs text-muted-foreground">{conv === null ? "Pas assez de données." : <>Sur 100 réservations, <b className="text-foreground">{conv}</b> aboutissent à un paiement.</>}</p>
        </Panel>
      </div>

      {/* Pareto : où concentrer l'effort */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Pareto · chiffre d'affaires par compagnie" subtitle={`Qui fait vraiment le chiffre d'affaires sur ${d.days} jours (barres) et part cumulée (courbe)`} right={<Link2 href="/compagnies" label="Compagnies" />}>
          {d.paretoRevenue.items.length === 0 ? <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p> : <ParetoChart items={d.paretoRevenue.items} unit=" XOF" valueLabel="Chiffre d'affaires" height={320} />}
          <ParetoNote p={d.paretoRevenue} noun="compagnie" action="Protège ces comptes en priorité : un départ ou un impayé de leur part pèse lourd." />
        </Panel>
        <Panel title="Concentration" subtitle="Risque de dépendance commerciale">
          <div className="space-y-4">
            {d.paretoRevenue.items.slice(0, 5).map((c, i) => (
              <div key={c.label}>
                <div className="flex items-baseline justify-between text-sm"><span className="truncate font-medium"><span className="mr-2 text-muted-foreground">{i + 1}</span>{c.href ? <Link href={c.href} className="hover:underline">{c.label}</Link> : c.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{c.sharePct} %</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, c.sharePct)}%` }} /></div>
              </div>
            ))}
          </div>
          <p className="mt-5 rounded-xl border border-border p-3 text-xs text-muted-foreground">Indice de concentration : <b className={cn("text-sm", d.paretoRevenue.topShare >= 40 ? "text-rose-600" : "text-foreground")}>{d.paretoRevenue.topShare >= 40 ? "élevé" : d.paretoRevenue.topShare >= 25 ? "modéré" : "faible"}</b> — la première compagnie représente {d.paretoRevenue.topShare} % du chiffre d&apos;affaires.</p>
        </Panel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Pareto · erreurs serveur par endpoint" subtitle="Où corriger en premier pour réduire les 5xx" right={<Link2 href="/supervision/api" label="Trafic API" />}>
          {d.paretoErrors.items.length === 0 ? <p className="flex items-center gap-2 text-sm text-lime-700"><CheckCircle size={18} weight="duotone" aria-hidden />Aucune erreur serveur sur la période.</p> : <ParetoChart items={d.paretoErrors.items} valueLabel="Erreurs 5xx" color="#e11d48" height={290} />}
          <ParetoNote p={d.paretoErrors} noun="endpoint" action="Un correctif sur ces routes supprime l'essentiel des erreurs." />
        </Panel>
        <Panel title="Pareto · causes d'échec de paiement" subtitle="Pourquoi les paiements échouent" right={<Link2 href="/ventes/paiements" label="Paiements" />}>
          {d.paretoFailures.items.length === 0 ? <p className="flex items-center gap-2 text-sm text-lime-700"><CheckCircle size={18} weight="duotone" aria-hidden />Aucun échec de paiement sur la période.</p> : <ParetoChart items={d.paretoFailures.items} valueLabel="Échecs" color="#f59e0b" height={290} />}
          <ParetoNote p={d.paretoFailures} noun="cause" action="Traiter ces causes d'abord fait gagner le plus de paiements." />
        </Panel>
      </div>

      {/* Chaleur + exploitation */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Chiffre d'affaires par compagnie et par jour" subtitle="Intensité du chiffre d'affaires encaissé (8 premières compagnies)">
          {d.heat.length === 0 ? <p className="text-sm text-muted-foreground">Aucune vente sur la période.</p> : <Heatmap days={d.series.map((x) => x.day)} tone="accent" rows={d.heat.map((h) => ({ label: h.label, cells: h.cells }))} />}
        </Panel>
        <Panel title="Colis" subtitle="Du dépôt à la livraison" right={<Link2 href="/colis-clients/colis" label="Suivi" />}>
          <ul className="space-y-3">
            {d.parcels.stages.map((st, i) => (
              <li key={st.label}><div className="flex justify-between text-sm"><span>{st.label}</span><b className="tabular-nums">{st.value}</b></div><div className="mt-1 h-2 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(3, (st.value / Math.max(1, ...d.parcels.stages.map((x) => x.value))) * 100)}%`, background: [ "#a1a1aa", INFO, VIOLET, OK][i] }} /></div></li>
            ))}
          </ul>
          <p className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><Warning size={14} weight="fill" aria-hidden className={d.parcels.late ? "text-rose-500" : "text-lime-600"} />{d.parcels.late} colis en retard de livraison</p>
        </Panel>
      </div>

      {/* Santé */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title={down ? `Santé des services · ${down} à surveiller` : "Santé des services · 24 h"} subtitle="Un carré par contrôle (toutes les 30 minutes dans cette maquette)" right={<Link2 href="/supervision/services" label="Supervision" />}>
          <ul className="space-y-2.5">
            {live.map((m) => (
              <li key={m.name} className="flex flex-wrap items-center gap-x-4 gap-y-1">
                <Link href={`/supervision/services?service=${encodeURIComponent(m.name)}`} className="w-44 shrink-0 truncate font-mono text-xs font-medium hover:underline">{m.name}</Link>
                <div className="min-w-40 flex-1"><StateTimeline states={m.states} height={18} /></div>
                <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{m.responseTimeMs} ms</span>
                <span className={cn("w-14 text-right text-xs font-semibold tabular-nums", (m.uptimePercent ?? 0) < 99.5 ? "text-rose-600" : "text-lime-700")}>{m.uptimePercent === null ? "—" : `${m.uptimePercent} %`}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Incidents ouverts" right={<Link2 href="/supervision/incidents" label="Tous" />}>
          {b.incidents.length === 0 && <p className="text-sm text-muted-foreground">Aucun incident ouvert.</p>}
          <ul className="space-y-2.5">
            {b.incidents.map((i) => (
              <li key={i.id}>
                <Link href={`/supervision/incidents/${i.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted">
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: SEV_BAR[i.severity] }} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.title}</p><p className="truncate text-xs text-muted-foreground">{i.serviceName} · {severityBadge(i.severity).label}</p></div>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Opérations */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Prochains départs" right={<Link2 href="/flotte/trajets" label="Trajets" />}>
          <ul className="space-y-3">
            {b.upcomingTrips.map((t) => {
              const taken = t.totalSeats - t.availableSeats;
              const fill = Math.round((taken / Math.max(1, t.totalSeats)) * 100);
              return (
                <li key={t.id}>
                  <Link href={`/flotte/trajets/${t.id}`} className="block rounded-xl border border-border p-3 hover:bg-muted">
                    <div className="flex items-center justify-between gap-2 text-sm"><span className="truncate font-semibold">{t.label}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(t.departure)}</span></div>
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-1.5 flex-1 rounded-full bg-muted"><span className="block h-full rounded-full" style={{ width: `${fill}%`, background: fill >= 85 ? OK : fill >= 40 ? ACCENT : WARN }} /></span><span className="tabular-nums">{taken}/{t.totalSeats}</span></div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">{t.companyName}</p>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Panel>
        <Panel title="Conformité" subtitle="Délais à tenir">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Demandes RGPD</p>
          {b.dsr.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande en cours.</p>}
          <ul className="space-y-2">
            {b.dsr.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 text-sm"><span className="truncate">{dsrTypeLabel(r.requestType)} <span className="text-xs text-muted-foreground">· {r.requesterName}</span></span><Pill tone={(r.daysLeft < 0 ? "rose" : r.daysLeft <= 5 ? "amber" : "zinc") as Tone}>{r.daysLeft < 0 ? `${-r.daysLeft} j de retard` : `${r.daysLeft} j`}</Pill></li>
            ))}
          </ul>
          <p className="mb-2 mt-5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">KYC à revoir</p>
          {b.pendingKyc.length === 0 && <p className="text-sm text-muted-foreground">Aucun document à revoir.</p>}
          <ul className="space-y-2">
            {b.pendingKyc.slice(0, 4).map((x) => <li key={x.id}><Link href={`/compagnies/${x.companyId}`} className="flex items-center justify-between gap-3 text-sm hover:underline"><span className="truncate font-medium">{x.companyName}</span><span className="shrink-0 text-xs text-muted-foreground">{x.typeName}</span></Link></li>)}
          </ul>
        </Panel>
        <Panel title="Capacité et abonnements">
          <div className="flex flex-col items-center gap-1">
            <Gauge value={k.busUtilisation ?? 0} label={`${k.busUtilisation ?? 0} %`} caption={`${b.kpis.activeBuses} bus en service sur ${b.kpis.totalBuses} (${b.kpis.busesInMaintenance} en maintenance)`} tone={(k.busUtilisation ?? 0) >= 80 ? "ok" : "warn"} />
          </div>
          <ul className="mt-5 space-y-2 border-t border-border pt-4">
            {b.plansMix.map((p, i) => (
              <li key={p.label} className="flex items-center gap-3 text-sm"><i className="size-2.5 rounded-sm" style={{ background: [ACCENT, INFO, OK, VIOLET][i % 4] }} /><span className="flex-1">{p.label}</span><b className="tabular-nums">{p.value}</b></li>
            ))}
          </ul>
        </Panel>
      </div>

      {/* Récent */}
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Réservations récentes" right={<Link2 href="/ventes/reservations" label="Toutes" />}>
          <ul className="divide-y divide-border">
            {b.recentBookings.map((r) => (
              <li key={r.id}>
                <Link href={`/ventes/reservations/${r.id}`} className="flex items-center gap-4 py-3 hover:bg-muted/50">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><Ticket size={22} weight="duotone" aria-hidden /></span>
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.passenger}</p><p className="truncate text-xs text-muted-foreground"><span className="font-mono">{r.code}</span> · {r.companyName}</p></div>
                  <p className="shrink-0 text-sm font-bold tabular-nums">{formatMoney(r.amount, r.currency)}</p>
                  <Pill tone={r.paymentStatus === "paid" ? "lime" : r.paymentStatus === "failed" ? "rose" : "amber"}>{r.paymentStatus === "paid" ? "Payé" : r.paymentStatus === "failed" ? "Échoué" : "En attente"}</Pill>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Activité récente" right={<Link2 href="/conformite/journal-audit" label="Journal" />}>
          <ol className="relative space-y-4 border-l border-border pl-5">
            {b.activity.map((a) => (
              <li key={a.id} className="relative text-sm">
                <span aria-hidden className="absolute -left-[25px] top-1.5 size-2 rounded-full bg-accent ring-4 ring-white dark:ring-card" />
                <p>{a.action}{a.companyName ? <span className="text-muted-foreground"> · {a.companyName}</span> : null}</p>
                <p className="text-xs text-muted-foreground">{a.actor} · {formatDateTime(a.at)}</p>
              </li>
            ))}
          </ol>
        </Panel>
      </div>
    </div>
  );
}
