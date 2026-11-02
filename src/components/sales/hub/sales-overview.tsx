import { ArrowRight, Basket, CalendarCheck, Coins, Funnel, Lightbulb, Percent, Pulse, Ticket } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Donut } from "@/components/dashboard/donut";
import { StatTile } from "@/components/dashboard/stat-tile";
import { TrendChart } from "@/components/dashboard/trend-chart";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { PERIODS, type SalesOverview } from "@/lib/repos/sales-hub";
import { cn } from "@/lib/utils";

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";
const ALERT = { danger: "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300", warning: "bg-orange-100 text-orange-800 dark:bg-orange-400/15 dark:text-orange-300", info: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300" } as const;
const DOT = { success: "bg-lime-500", warning: "bg-orange-500", danger: "bg-rose-500", info: "bg-sky-500" } as const;

export function SalesOverviewView({ o, periodHref }: { o: SalesOverview; periodHref: (days: number) => string }) {
  const maxRoute = Math.max(1, ...o.topRoutes.map((r) => r.revenue));
  const top = o.funnel[0]!.value || 1;
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-muted-foreground">Sur les {o.days} derniers jours</h2>
        <div role="group" aria-label="Période" className="inline-flex rounded-xl border border-border bg-muted/70 p-1 text-sm">
          {PERIODS.map((d) => (
            <Link key={d} href={periodHref(d)} aria-current={d === o.days ? "page" : undefined} className={cn("rounded-lg px-4 py-1.5 font-medium transition-colors", d === o.days ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground")}>{d} j</Link>
          ))}
        </div>
      </div>

      <section aria-label="Indicateurs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Chiffre d'affaires" value={formatMoney(o.revenue, o.currency)} delta={o.revenueDelta} hint="vs période précédente" icon={Coins} tone="success" />
        <StatTile label="Réservations" value={formatNumber(o.bookings)} delta={o.bookingsDelta} hint="vs période précédente" icon={CalendarCheck} tone="info" />
        <StatTile label="Panier moyen" value={formatMoney(o.average, o.currency)} hint="par réservation payée" icon={Basket} tone="accent" />
        <StatTile label="Taux de conversion" value={o.conversion === null ? "—" : `${o.conversion} %`} hint="réservations payées" icon={Percent} tone="info" />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={cn(CARD, "xl:col-span-2")} aria-label="Tendance">
          <h3 className="mb-4 font-semibold">Ventes · {o.days} jours</h3>
          <TrendChart data={o.series} />
        </section>
        <section className={CARD} aria-label="Constats">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Lightbulb size={18} weight="duotone" aria-hidden className="text-accent" />À retenir</h3>
          {o.insights.length === 0 && <p className="text-sm text-muted-foreground">Pas assez de ventes sur la période.</p>}
          <ul className="space-y-3 text-sm">
            {o.insights.map((i) => <li key={i} className="rounded-xl bg-muted/70 p-3">{i}</li>)}
          </ul>
          {o.alerts.length > 0 && (
            <>
              <h4 className="mb-2 mt-6 text-xs font-semibold uppercase tracking-wide text-muted-foreground">À surveiller</h4>
              <ul className="space-y-2">
                {o.alerts.map((a) => (
                  <li key={a.key}><Link href={a.href} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3 text-sm hover:bg-muted"><span>{a.label}</span><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-bold tabular-nums", ALERT[a.tone])}>{a.count}</span></Link></li>
                ))}
              </ul>
            </>
          )}
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={CARD} aria-label="Entonnoir">
          <h3 className="mb-4 flex items-center gap-2 font-semibold"><Funnel size={18} weight="duotone" aria-hidden className="text-accent" />Entonnoir de vente</h3>
          <ul className="space-y-3.5">
            {o.funnel.map((s, i) => {
              const prev = i === 0 ? null : o.funnel[i - 1]!.value;
              return (
                <li key={s.label}>
                  <div className="flex items-baseline justify-between text-sm"><span className="font-medium">{s.label}</span><span className="tabular-nums"><span className="font-bold">{formatNumber(s.value)}</span>{prev ? <span className="ml-2 text-xs text-muted-foreground">{prev === 0 ? "—" : Math.round((s.value / prev) * 100)} %</span> : null}</span></div>
                  <div className="mt-1.5 h-2.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (s.value / top) * 100)}%`, opacity: 1 - i * 0.18 }} /></div>
                </li>
              );
            })}
          </ul>
        </section>
        <section className={CARD} aria-label="Lignes">
          <div className="mb-4 flex items-center justify-between"><h3 className="font-semibold">Lignes les plus rentables</h3><Link href="/flotte/lignes" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">Lignes <ArrowRight size={12} aria-hidden /></Link></div>
          {o.topRoutes.length === 0 && <p className="text-sm text-muted-foreground">Aucune vente.</p>}
          <ul className="space-y-4">
            {o.topRoutes.map((r, i) => (
              <li key={r.label}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="truncate font-medium"><span className="mr-2 text-muted-foreground">{i + 1}</span>{r.label}</span><span className="shrink-0 tabular-nums text-muted-foreground">{formatMoney(r.revenue, o.currency)}</span></div>
                <div className="mt-1.5 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(4, (r.revenue / maxRoute) * 100)}%` }} /></div>
              </li>
            ))}
          </ul>
        </section>
        <section className={CARD} aria-label="Canaux">
          <h3 className="mb-4 font-semibold">Canaux de vente</h3>
          <Donut data={o.channels.map((c, i) => ({ ...c, tone: i === 0 ? "accent" : "info" }))} centerLabel="réservations" />
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <section className={CARD} aria-label="Heures de pointe">
          <h3 className="mb-1 flex items-center gap-2 font-semibold"><Pulse size={18} weight="duotone" aria-hidden className="text-accent" />Quand les voyageurs réservent</h3>
          <p className="mb-4 text-xs text-muted-foreground">Réservations par jour de la semaine et moment de la journée (UTC)</p>
          <div className="grid grid-cols-[3rem_repeat(4,1fr)] items-center gap-1.5 text-xs">
            <span />
            {["Nuit", "Matin", "Après-midi", "Soir"].map((p) => <span key={p} className="text-center text-muted-foreground">{p}</span>)}
            {o.heat.map((row) => (
              <div key={row.day} className="contents">
                <span className="text-muted-foreground">{row.day}</span>
                {row.cells.map((n, i) => (
                  <span key={i} title={`${row.day} · ${n} réservation(s)`} className="flex h-9 items-center justify-center rounded-lg font-medium tabular-nums" style={{ background: n === 0 ? "var(--muted)" : `color-mix(in srgb, #ea580c ${Math.round(18 + (n / o.heatMax) * 72)}%, transparent)`, color: n / o.heatMax > 0.55 ? "#fff" : undefined }}>{n || ""}</span>
                ))}
              </div>
            ))}
          </div>
        </section>
        <section className={CARD} aria-label="Activité en direct">
          <div className="mb-4 flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold"><span className="relative flex size-2.5"><span className="absolute inline-flex size-full animate-ping rounded-full bg-lime-500 opacity-60" /><span className="relative inline-flex size-2.5 rounded-full bg-lime-500" /></span>Activité récente</h3><Link href="/ventes/reservations" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">Réservations <ArrowRight size={12} aria-hidden /></Link></div>
          <ol className="space-y-3">
            {o.feed.map((e) => (
              <li key={e.id}><Link href={e.href} className="flex items-center gap-3 rounded-xl p-2 hover:bg-muted"><span aria-hidden className={cn("size-2.5 shrink-0 rounded-full", DOT[e.tone])} /><span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted"><Ticket size={16} weight="duotone" aria-hidden /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold">{e.label}</span><span className="block truncate text-xs text-muted-foreground">{e.detail}</span></span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(e.at)}</span></Link></li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  );
}
