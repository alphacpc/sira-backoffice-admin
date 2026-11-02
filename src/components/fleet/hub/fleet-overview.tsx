import {
  ArrowRight, Bus, CalendarCheck, CheckCircle, Clock, Coins, FileText, Gauge, ShieldWarning, Wrench,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import type { FleetOverview } from "@/lib/repos/fleet-hub";
import { cn } from "@/lib/utils";

const ALERT_TONE = { danger: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", warning: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300", info: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" } as const;
const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";

function CardHead({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{link ?? "Voir tout"} <ArrowRight size={12} aria-hidden /></Link>}
    </div>
  );
}

function Ring({ percent }: { percent: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative size-36 shrink-0" role="img" aria-label={`Disponibilité ${percent} %`}>
      <svg viewBox="0 0 120 120" className="size-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="11" className="stroke-muted" />
        <circle cx="60" cy="60" r={r} fill="none" strokeWidth="11" strokeLinecap="round" className="stroke-lime-500" strokeDasharray={c} strokeDashoffset={c * (1 - percent / 100)} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-extrabold tabular-nums">{percent}<span className="text-lg">%</span></span>
        <span className="text-[10px] uppercase tracking-wide text-muted-foreground">disponible</span>
      </div>
    </div>
  );
}

export function FleetOverviewView({ o }: { o: FleetOverview }) {
  const stats: Stat[] = [
    { label: "Flotte totale", value: formatNumber(o.total), icon: Bus, hint: `${o.byStatus.retired} hors service` },
    { label: "Taux de remplissage", value: o.fillPercent === null ? "—" : `${o.fillPercent} %`, icon: Gauge, hint: `${o.upcomingTrips} trajet(s) à venir` },
    { label: "En maintenance", value: formatNumber(o.byStatus.maintenance), icon: Wrench },
    { label: "Maintenance (30 j)", value: formatMoney(o.maintenanceCost30d, o.currency), icon: Coins, hint: "interventions terminées" },
  ];
  const max = Math.max(1, ...o.byCompany.map((c) => c.total));
  return (
    <div className="space-y-5">
      <StatStrip stats={stats} />

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={cn(CARD, "xl:col-span-2")} aria-label="État de la flotte">
          <CardHead title="État de la flotte" href="/flotte/bus" link="Tous les bus" />
          <div className="flex flex-wrap items-center gap-8">
            <Ring percent={o.availabilityPercent} />
            <ul className="min-w-48 flex-1 space-y-3 text-sm">
              {([["En service", o.byStatus.active, "bg-lime-500"], ["En maintenance", o.byStatus.maintenance, "bg-orange-500"], ["Hors service", o.byStatus.retired, "bg-zinc-400"]] as const).map(([label, n, dot]) => (
                <li key={label} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2"><span aria-hidden className={cn("size-2.5 rounded-full", dot)} />{label}</span>
                  <span className="font-semibold tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <h4 className="mb-3 mt-8 text-sm font-semibold text-muted-foreground">Répartition par compagnie</h4>
          <ul className="space-y-3">
            {o.byCompany.map((c) => (
              <li key={c.id}>
                <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{c.name}</span><span className="tabular-nums text-muted-foreground">{c.total} bus</span></div>
                <div className="mt-1.5 flex h-2.5 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(8, (c.total / max) * 100)}%` }}>
                  <span className="bg-lime-500" style={{ width: `${(c.active / c.total) * 100}%` }} /><span className="bg-orange-500" style={{ width: `${(c.maintenance / c.total) * 100}%` }} /><span className="bg-zinc-400" style={{ width: `${(c.retired / c.total) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className={CARD} aria-label="Alertes">
          <CardHead title="Alertes de flotte" />
          {o.alerts.length === 0 && <p className="flex items-center gap-2 text-sm text-lime-600"><CheckCircle size={18} weight="duotone" aria-hidden /> Aucune alerte.</p>}
          <ul className="space-y-2">
            {o.alerts.map((a) => (
              <li key={a.key}>
                <Link href={a.href} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3.5 hover:bg-muted">
                  <div className="min-w-0"><p className="text-sm font-semibold">{a.label}</p><p className="truncate text-xs text-muted-foreground">{a.hint}</p></div>
                  <span className={cn("min-w-8 rounded-full px-2.5 py-1 text-center text-sm font-bold tabular-nums", ALERT_TONE[a.tone])}>{a.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={cn(CARD, "xl:col-span-2")} aria-label="Prochains départs">
          <CardHead title="Prochains départs" href="/flotte/trajets" />
          {o.departures.length === 0 && <p className="text-sm text-muted-foreground">Aucun départ planifié.</p>}
          <ul className="divide-y divide-border">
            {o.departures.map((t) => {
              const sold = t.totalSeats - t.availableSeats;
              const pct = Math.round((sold / Math.max(1, t.totalSeats)) * 100);
              return (
                <li key={t.id}>
                  <Link href={`/flotte/trajets/${t.id}`} className="flex flex-wrap items-center gap-4 py-3.5">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><CalendarCheck size={22} weight="duotone" aria-hidden /></span>
                    <div className="min-w-0 flex-1"><p className="truncate font-bold">{t.routeLabel}</p><p className="truncate text-xs text-muted-foreground">{formatDateTime(t.departure)} · {t.busPlate} · {t.companyName}</p></div>
                    <div className="w-32"><div className="flex justify-between text-xs"><span className="tabular-nums font-medium">{sold}/{t.totalSeats}</span><span className="text-muted-foreground">{pct} %</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} /></div></div>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className={CARD} aria-label="Maintenance">
          <CardHead title="Maintenance" href="/flotte/maintenance" />
          {o.maintenance.length === 0 && <p className="text-sm text-muted-foreground">Aucune intervention en cours ou à venir.</p>}
          <ul className="space-y-3">
            {o.maintenance.map((m) => (
              <li key={m.id}>
                <Link href={`/flotte/bus/${m.busId}?onglet=maintenance`} className="flex items-start gap-3 rounded-xl border border-border p-3 hover:bg-muted">
                  <Wrench size={20} weight="duotone" aria-hidden className={m.status === "IN_PROGRESS" ? "mt-0.5 text-violet-500" : "mt-0.5 text-sky-500"} />
                  <div className="min-w-0"><p className="truncate text-sm font-semibold">{m.type}</p><p className="truncate text-xs text-muted-foreground"><span className="font-bold tabular-nums text-foreground">{m.busPlate}</span> · {m.status === "IN_PROGRESS" ? "En cours" : "Planifiée"}</p></div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>

      {o.documents.length > 0 && (
        <section className={CARD} aria-label="Documents à renouveler">
          <CardHead title="Documents à renouveler" href="/flotte/bus" link="Voir les bus" />
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {o.documents.map((d, i) => (
              <li key={`${d.busId}-${d.label}-${i}`}>
                <Link href={`/flotte/bus/${d.busId}`} className="flex items-center gap-3 rounded-xl border border-border p-3.5 hover:bg-muted">
                  {d.daysLeft < 0 ? <ShieldWarning size={24} weight="duotone" aria-hidden className="shrink-0 text-rose-500" /> : <FileText size={24} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />}
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{d.label} · <span className="tabular-nums">{d.plate}</span></p><p className="truncate text-xs text-muted-foreground">{d.companyName}</p></div>
                  <span className={cn("shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium", d.daysLeft < 0 ? ALERT_TONE.danger : ALERT_TONE.warning)}>
                    <Clock size={12} aria-hidden className="mr-1 inline" />{d.daysLeft < 0 ? `Expiré (${-d.daysLeft} j)` : `${d.daysLeft} j`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
