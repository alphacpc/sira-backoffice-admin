import { ArrowRight, Bug, CheckCircle, Clock, HardDrives, Lightning, Siren, Timer, UsersThree, WifiHigh } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Pill, type Tone } from "@/components/compliance/hub/pills";
import { CompanyAvatar } from "@/components/ui/company-avatar";
import { formatDateTime, formatNumber } from "@/lib/format";
import { impactScopeLabel, incidentStatusBadge, severityBadge } from "@/lib/labels";
import { API_SLO, LATENCY_BUDGET_MS, SERVICE_SLO, type ApiDash, type EndpointMetric, type IncidentDash, type MonOverview, type ServiceMetric, type UsageDash } from "@/lib/repos/monitoring-hub";
import { serviceFilterHref } from "@/lib/filters";
import { cn } from "@/lib/utils";
import { FleetChart, LatencyChart, ServiceLinesChart, TrafficChart, UsageAreaChart } from "./charts";
import { ACCENT, BAD, Delta, Gauge, Heatmap, INFO, OK, Panel, Sparkline, StatPanel, StateTimeline, VIOLET, WARN } from "./primitives";

const dm = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;
const ago = (iso: string, now = Date.now()) => {
  const m = Math.round((now - Date.parse(iso)) / 60_000);
  return m < 60 ? `il y a ${m} min` : m < 2880 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};
export const duration = (minutes: number) => minutes < 60 ? `${minutes} min` : minutes < 1440 ? `${Math.floor(minutes / 60)} h ${minutes % 60 ? `${minutes % 60} min` : ""}`.trim() : `${Math.floor(minutes / 1440)} j ${Math.floor((minutes % 1440) / 60)} h`;
const STATUS = { healthy: ["Opérationnel", "lime"], degraded: ["Dégradé", "amber"], down: ["En panne", "rose"] } as const;
const SEV_TONE: Record<string, Tone> = { LOW: "zinc", MEDIUM: "amber", HIGH: "orange", CRITICAL: "rose" };
const SEV_BAR: Record<string, string> = { LOW: "#a1a1aa", MEDIUM: WARN, HIGH: ACCENT, CRITICAL: BAD };
const METHOD: Record<string, string> = { GET: "bg-sky-100 text-sky-800 dark:bg-sky-400/15 dark:text-sky-300", POST: "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300", PATCH: "bg-violet-100 text-violet-800 dark:bg-violet-400/15 dark:text-violet-300" };
const MethodTag = ({ m }: { m: string }) => <span className={cn("rounded-md px-1.5 py-0.5 font-mono text-[10px] font-bold", METHOD[m])}>{m}</span>;

function ServicePill({ s }: { s: ServiceMetric }) {
  if (s.stale) return <Pill tone="zinc">Obsolète</Pill>;
  const [label, tone] = STATUS[s.status];
  return <Pill tone={tone}>{label}</Pill>;
}

function Head({ href, link }: { href: string; link: string }) {
  return <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{link} <ArrowRight size={12} aria-hidden /></Link>;
}

/* ───────────── Overview ───────────── */
export function OverviewView({ o }: { o: MonOverview }) {
  const a = o.api;
  const s = o.services;
  const inc = o.incidents;
  const latencyOk = a.totals.avgResponseMs <= LATENCY_BUDGET_MS;
  return (
    <div className="space-y-5">
      <section aria-label="Indicateurs clés" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <StatPanel label="Services en ligne" value={`${s.healthy}`} unit={`/ ${s.total - s.stale}`} hint={s.down + s.degraded ? `${s.down} en panne · ${s.degraded} dégradé(s)` : "tous opérationnels"} icon={HardDrives} color={s.down ? BAD : s.degraded ? WARN : OK} tone={s.down ? "bad" : s.degraded ? "warn" : undefined} />
        <StatPanel label="Disponibilité API" value={a.totals.availability.toFixed(2)} unit="%" delta={a.prev ? Math.round((a.totals.availability - a.prev.availability) * 100) / 100 : null} hint={`Objectif ${API_SLO} %`} spark={a.byDay.map((d) => 100 - d.err5)} icon={CheckCircle} color={a.totals.availability >= API_SLO ? OK : BAD} tone={a.totals.availability >= API_SLO ? undefined : "bad"} />
        <StatPanel label="Requêtes" value={formatNumber(a.totals.count)} delta={a.prev && a.prev.count ? Math.round(((a.totals.count - a.prev.count) / a.prev.count) * 100) : null} hint={`${a.totals.rps} req/s en moyenne`} spark={a.byDay.map((d) => d.total)} icon={Lightning} color={INFO} />
        <StatPanel label="Latence moyenne" value={formatNumber(a.totals.avgResponseMs)} unit="ms" delta={a.prev && a.prev.avgMs ? Math.round(((a.totals.avgResponseMs - a.prev.avgMs) / a.prev.avgMs) * 100) : null} inverse hint={`${a.totals.slowShare} % des appels au-dessus de ${LATENCY_BUDGET_MS} ms`} spark={a.byDay.map((d) => d.avgMs)} icon={Timer} color={latencyOk ? ACCENT : BAD} />
        <StatPanel label="Taux d'erreur 5xx" value={a.totals.serverErrorPercent.toFixed(1)} unit="%" delta={a.prev ? Math.round((a.totals.serverErrorPercent - a.prev.err5) * 10) / 10 : null} inverse hint={`${a.totals.clientErrorPercent} % d'erreurs client (4xx)`} spark={a.byDay.map((d) => d.err5)} icon={Bug} color={BAD} tone={a.totals.serverErrorPercent >= 1 ? "bad" : undefined} />
        <StatPanel label="Incidents ouverts" value={`${inc.open}`} hint={inc.mttrMinutes === null ? "aucun résolu" : `MTTR ${duration(inc.mttrMinutes)}`} icon={Siren} color={inc.open ? BAD : OK} tone={inc.open ? "warn" : undefined} />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Trafic et erreurs" subtitle={`Requêtes par jour (${dm(a.from)} → ${dm(a.to)}) et taux d'erreur serveur`} right={<Head href="/supervision/api" link="Détail API" />}>
          <TrafficChart data={a.byDay} />
        </Panel>
        <Panel title="Budget d'erreur" subtitle={`Objectif de disponibilité ${API_SLO} % (appels sans 5xx)`}>
          <Gauge value={Math.min(a.totals.budgetUsedPct, 100)} label={`${a.totals.budgetUsedPct} %`} caption={a.totals.budgetUsedPct >= 100 ? "Budget épuisé : geler les mises en production" : a.totals.budgetUsedPct >= 70 ? "Consommation élevée, surveiller" : "Budget confortable"} tone={a.totals.budgetUsedPct >= 100 ? "bad" : a.totals.budgetUsedPct >= 70 ? "warn" : "ok"} />
          <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-4 text-center">
            <div><dt className="text-[11px] text-muted-foreground">5xx</dt><dd className="font-bold tabular-nums">{formatNumber(a.byDay.reduce((n, d) => n + d.c5, 0))}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Pic</dt><dd className="font-bold tabular-nums">{a.peak ? formatNumber(a.peak.total) : "—"}</dd></div>
            <div><dt className="text-[11px] text-muted-foreground">Latence max</dt><dd className="font-bold tabular-nums">{formatNumber(a.totals.maxResponseMs)} ms</dd></div>
          </dl>
        </Panel>
      </div>

      <Panel title="État des services · 24 h" subtitle="Un carré par contrôle, un contrôle toutes les 30 minutes dans cette maquette" right={<Head href="/supervision/services" link="Tous les services" />}>
        <ul className="space-y-2.5">
          {o.metrics.filter((m) => !m.stale).map((m) => (
            <li key={m.name} className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link href={serviceFilterHref("/supervision/services", m.name)} className="w-44 shrink-0 truncate font-mono text-xs font-medium hover:underline">{m.name}</Link>
              <div className="min-w-48 flex-1"><StateTimeline states={m.states} /></div>
              <span className="w-16 text-right text-xs tabular-nums text-muted-foreground">{m.responseTimeMs} ms</span>
              <span className={cn("w-16 text-right text-xs font-semibold tabular-nums", (m.uptimePercent ?? 0) < SERVICE_SLO ? "text-rose-600" : "text-lime-700")}>{m.uptimePercent === null ? "—" : `${m.uptimePercent} %`}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: OK }} />Opérationnel</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: WARN }} />Dégradé</span><span className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: BAD }} />En panne</span></p>
      </Panel>

      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Erreurs serveur par endpoint" subtitle="Intensité du taux de 5xx, jour par jour (10 endpoints les plus appelés)" right={<Head href="/supervision/api" link="Endpoints" />}>
          <Heatmap days={a.byDay.map((d) => d.day)} tone="rose"
            rows={a.heat.map((h) => ({ label: h.endpoint, badge: h.method, cells: h.cells.map((c) => ({ day: c.day, value: c.err5, title: `${dm(c.day)} · ${formatNumber(c.count)} appels · ${c.err5} % de 5xx` })) }))} />
        </Panel>
        <Panel title="Incidents récents" right={<Head href="/supervision/incidents" link="Tous" />}>
          {inc.rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun incident.</p>}
          <ul className="space-y-2.5">
            {inc.rows.slice(0, 4).map((i) => (
              <li key={i.id}>
                <Link href={`/supervision/incidents/${i.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted">
                  <span className="h-9 w-1 shrink-0 rounded-full" style={{ background: SEV_BAR[i.severity] }} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{i.title}</p><p className="truncate text-xs text-muted-foreground">{i.serviceName} · {ago(i.detectedAt)}</p></div>
                  <Pill tone={i.status === "RESOLVED" ? "lime" : "rose"}>{incidentStatusBadge(i.status).label}</Pill>
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Flotte : latence et disponibilité · 24 h" subtitle="Moyenne de tous les services en ligne"><FleetChart data={o.fleet} /></Panel>
        <Panel title="Latence de l'API" subtitle="Moyenne quotidienne et budget de latence" right={<Head href="/supervision/api" link="Détail" />}><LatencyChart data={a.byDay} budget={LATENCY_BUDGET_MS} height={240} /></Panel>
      </div>
    </div>
  );
}

/* ───────────── Services ───────────── */
export function ServicesView({ metrics, fleet, series, names }: { metrics: ServiceMetric[]; fleet: Parameters<typeof FleetChart>[0]["data"]; series: Record<string, number | string>[]; names: string[] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Latence par service · 24 h" subtitle="Temps de réponse de chaque contrôle (plafonné à 2 s pour la lisibilité)"><ServiceLinesChart data={series} series={names} /></Panel>
        <Panel title="Flotte : latence et disponibilité · 24 h" subtitle="Moyenne de tous les services en ligne"><FleetChart data={fleet} height={300} /></Panel>
      </div>
      <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {metrics.map((m) => (
          <li key={m.name} className="rounded-2xl bg-white p-5 shadow-card dark:bg-card">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="truncate font-mono text-sm font-bold">{m.name}</p><p className="mt-0.5 text-xs text-muted-foreground">Contrôlé {ago(m.checkedAt)}</p></div>
              <ServicePill s={m} />
            </div>
            <div className="mt-4 flex items-end justify-between gap-4">
              <p className="text-4xl font-extrabold leading-none tabular-nums">{m.responseTimeMs}<span className="ml-1 text-base font-semibold text-muted-foreground">ms</span></p>
              <div className="w-32"><Sparkline values={m.states.map((s) => s.ms)} color={m.status === "healthy" ? INFO : m.status === "degraded" ? WARN : BAD} height={40} /></div>
            </div>
            <dl className="mt-4 grid grid-cols-4 gap-2 text-center">
              {[["p50", `${m.p50} ms`], ["p95", `${m.p95} ms`], ["Max", `${formatNumber(m.max)} ms`], ["Moy.", `${m.avg} ms`]].map(([k, v]) => (
                <div key={k} className="rounded-xl bg-muted/60 px-1 py-2"><dt className="text-[10px] uppercase tracking-wide text-muted-foreground">{k}</dt><dd className="mt-0.5 text-xs font-bold tabular-nums">{v}</dd></div>
              ))}
            </dl>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Disponibilité 24 h</span>
                <span className={cn("font-bold tabular-nums", m.sloOk ? "text-lime-700" : "text-rose-600")}>{m.uptimePercent === null ? "—" : `${m.uptimePercent} %`} <span className="font-normal text-muted-foreground">/ {SERVICE_SLO} %</span></span>
              </div>
              <StateTimeline states={m.states} height={16} />
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border pt-3 text-xs text-muted-foreground">
              <span>{m.downChecks} panne(s) · {m.degradedChecks} dégradation(s)</span>
              {m.openIncidents > 0
                ? <Link href={serviceFilterHref("/supervision/incidents", m.name)} className="inline-flex items-center gap-1 font-semibold text-rose-600 hover:underline"><Siren size={14} weight="fill" aria-hidden />{m.openIncidents} incident(s)</Link>
                : <span className="inline-flex items-center gap-1 text-lime-700"><CheckCircle size={14} weight="fill" aria-hidden />Aucun incident</span>}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ───────────── API ───────────── */
function EndpointTable({ rows }: { rows: EndpointMetric[] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="overflow-x-auto rounded-2xl bg-white shadow-card dark:bg-card">
      <table className="w-full min-w-[920px] text-left text-sm">
        <thead className="border-b border-border text-[11px] uppercase tracking-wide text-muted-foreground">
          <tr><th className="px-5 py-3 font-semibold">Endpoint</th><th className="px-3 py-3 font-semibold">Volume</th><th className="px-3 py-3 font-semibold">Tendance</th><th className="px-3 py-3 font-semibold">vs période préc.</th><th className="px-3 py-3 text-right font-semibold">Moy.</th><th className="px-3 py-3 text-right font-semibold">Max</th><th className="px-3 py-3 text-right font-semibold">4xx</th><th className="px-5 py-3 text-right font-semibold">5xx</th></tr>
        </thead>
        <tbody>
          {rows.map((e) => (
            <tr key={`${e.method} ${e.endpoint}`} className="border-b border-border last:border-0">
              <td className="px-5 py-3"><div className="flex items-center gap-2"><MethodTag m={e.method} /><span className="font-mono text-xs font-medium">{e.endpoint}</span></div></td>
              <td className="px-3 py-3"><div className="flex items-center gap-2"><span className="w-14 tabular-nums">{formatNumber(e.count)}</span><div className="h-1.5 w-24 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.max(3, (e.count / max) * 100)}%` }} /></div></div></td>
              <td className="px-3 py-3"><div className="w-24"><Sparkline values={e.spark} color={e.err5 >= 1 ? BAD : INFO} height={26} /></div></td>
              <td className="px-3 py-3"><Delta value={e.deltaPct} /></td>
              <td className={cn("px-3 py-3 text-right tabular-nums", e.slow && "font-semibold text-rose-600")}>{e.avgMs} ms</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{formatNumber(e.maxMs)} ms</td>
              <td className="px-3 py-3 text-right tabular-nums text-muted-foreground">{e.err4} %</td>
              <td className={cn("px-5 py-3 text-right tabular-nums", e.err5 >= 1 ? "font-bold text-rose-600" : "text-muted-foreground")}>{e.err5} %</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ApiView({ a, rows, pager }: { a: ApiDash; rows: EndpointMetric[]; pager: React.ReactNode }) {
  const slowest = [...a.endpoints].sort((x, y) => y.avgMs - x.avgMs).slice(0, 5);
  const worst = [...a.endpoints].filter((e) => e.err5 > 0).sort((x, y) => y.err5 - x.err5).slice(0, 5);
  const maxSlow = Math.max(1, ...slowest.map((e) => e.avgMs));
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Requêtes par jour" subtitle="Par classe de statut, avec le taux de 5xx"><TrafficChart data={a.byDay} /></Panel>
        <Panel title="Budget d'erreur" subtitle={`Objectif ${API_SLO} % de disponibilité`}>
          <Gauge value={Math.min(a.totals.budgetUsedPct, 100)} label={`${a.totals.budgetUsedPct} %`} caption="du budget d'erreur consommé" tone={a.totals.budgetUsedPct >= 100 ? "bad" : a.totals.budgetUsedPct >= 70 ? "warn" : "ok"} />
          <ul className="mt-4 space-y-2 border-t border-border pt-4 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Disponibilité mesurée</span><b className="tabular-nums">{a.totals.availability.toFixed(2)} %</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Débit moyen</span><b className="tabular-nums">{a.totals.rps} req/s</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Jour le plus chargé</span><b className="tabular-nums">{a.peak ? `${dm(a.peak.day)} · ${formatNumber(a.peak.total)}` : "—"}</b></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Appels lents (&gt; {LATENCY_BUDGET_MS} ms)</span><b className="tabular-nums">{a.totals.slowShare} %</b></li>
          </ul>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Latence" subtitle="Moyenne quotidienne et budget de latence"><LatencyChart data={a.byDay} budget={LATENCY_BUDGET_MS} /></Panel>
        <Panel title="Qui consomme l'API" subtitle="Part du trafic par compagnie">
          <ul className="space-y-3.5">
            {a.consumers.slice(0, 6).map((c) => (
              <li key={c.companyId ?? "anon"} className="flex items-center gap-3">
                <CompanyAvatar name={c.name} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm"><span className="truncate font-medium">{c.name}</span><span className="shrink-0 tabular-nums text-muted-foreground">{formatNumber(c.count)} · {c.share.toFixed(0)} %</span></div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${Math.max(3, c.share)}%`, background: c.err5 >= 1 ? BAD : ACCENT }} /></div>
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 flex gap-3 text-xs text-muted-foreground">{a.methods.map((m) => <span key={m.method} className="inline-flex items-center gap-1.5"><MethodTag m={m.method} />{formatNumber(m.count)}</span>)}</p>
        </Panel>
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Endpoints les plus lents" subtitle="Latence moyenne sur la période">
          <ul className="space-y-3">
            {slowest.map((e) => (
              <li key={`${e.method}${e.endpoint}`}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="flex min-w-0 items-center gap-2"><MethodTag m={e.method} /><span className="truncate font-mono text-xs">{e.endpoint}</span></span><span className={cn("shrink-0 font-bold tabular-nums", e.slow && "text-rose-600")}>{e.avgMs} ms</span></div>
                <div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(e.avgMs / maxSlow) * 100}%`, background: e.slow ? BAD : VIOLET }} /></div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Endpoints les plus en erreur" subtitle="Taux de 5xx sur la période">
          {worst.length === 0 && <p className="flex items-center gap-2 text-sm text-lime-700"><CheckCircle size={18} weight="duotone" aria-hidden />Aucune erreur serveur.</p>}
          <ul className="space-y-3">
            {worst.map((e) => (
              <li key={`${e.method}${e.endpoint}`} className="flex items-center gap-3">
                <span className="flex min-w-0 flex-1 items-center gap-2"><MethodTag m={e.method} /><span className="truncate font-mono text-xs">{e.endpoint}</span></span>
                <div className="w-24"><Sparkline values={e.spark} color={BAD} height={24} /></div>
                <span className="w-14 text-right font-bold tabular-nums text-rose-600">{e.err5} %</span>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Carte de chaleur des erreurs" subtitle="Taux de 5xx par endpoint et par jour">
        <Heatmap days={a.byDay.map((d) => d.day)} tone="rose" rows={a.heat.map((h) => ({ label: h.endpoint, badge: h.method, cells: h.cells.map((c) => ({ day: c.day, value: c.err5, title: `${dm(c.day)} · ${formatNumber(c.count)} appels · ${c.err5} % de 5xx` })) }))} />
      </Panel>
      <Panel title="Carte de chaleur du volume" subtitle="Nombre d'appels par endpoint et par jour">
        <Heatmap days={a.byDay.map((d) => d.day)} tone="accent" rows={a.heat.map((h) => ({ label: h.endpoint, badge: h.method, cells: h.cells.map((c) => ({ day: c.day, value: c.count, title: `${dm(c.day)} · ${formatNumber(c.count)} appels` })) }))} />
      </Panel>
      <div><h3 className="mb-3 font-semibold">Tous les endpoints</h3><EndpointTable rows={rows} />{pager}</div>
    </div>
  );
}

/* ───────────── Incidents ───────────── */
export function IncidentsView({ d, rows, pager, now }: { d: IncidentDash; rows: IncidentDash["rows"]; pager: React.ReactNode; now: number }) {
  const maxSvc = Math.max(1, ...d.byService.map((s) => s.count));
  return (
    <div className="space-y-5">
      <Panel title={`Chronologie · ${d.spanDays} jours`} subtitle="Chaque barre est un incident, de sa détection à sa résolution (ou à maintenant)">
        {d.timeline.length === 0 ? <p className="text-sm text-muted-foreground">Aucun incident sur la période.</p> : (
          <div className="space-y-2">
            {d.timeline.map((t) => (
              <Link key={t.row.id} href={`/supervision/incidents/${t.row.id}`} className="group flex items-center gap-3">
                <span className="w-44 shrink-0 truncate font-mono text-xs group-hover:underline" title={t.row.title}>{t.row.serviceName}</span>
                <div className="relative h-5 flex-1 rounded-md bg-muted/70">
                  <span className="absolute top-0 h-5 rounded-md" title={`${t.row.incidentCode} · ${t.row.title}`}
                    style={{ left: `${t.startPct}%`, width: `${Math.max(1.2, t.endPct - t.startPct)}%`, background: SEV_BAR[t.row.severity], opacity: t.row.status === "RESOLVED" ? 0.55 : 1 }} />
                </div>
              </Link>
            ))}
            <div className="flex gap-3 pt-1 text-[10px] text-muted-foreground"><span className="w-44 shrink-0" /><div className="flex flex-1 justify-between"><span>il y a {d.spanDays} j</span><span>il y a {Math.round(d.spanDays / 2)} j</span><span>aujourd&apos;hui</span></div></div>
          </div>
        )}
        <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">{(["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const).map((s) => <span key={s} className="inline-flex items-center gap-1.5"><i className="size-2.5 rounded-sm" style={{ background: SEV_BAR[s] }} />{severityBadge(s).label}</span>)}<span>Barre pâle : incident résolu</span></p>
      </Panel>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Répartition par gravité">
          <ul className="space-y-3">
            {d.bySeverity.map((s) => (
              <li key={s.severity} className="flex items-center gap-3 text-sm"><span className="w-20 shrink-0">{severityBadge(s.severity).label}</span><div className="h-2 flex-1 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(s.value / Math.max(1, d.open + d.resolved)) * 100}%`, background: SEV_BAR[s.severity] }} /></div><b className="w-6 text-right tabular-nums">{s.value}</b></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Services les plus touchés">
          <ul className="space-y-3">
            {d.byService.slice(0, 5).map((s) => (
              <li key={s.name}><div className="flex justify-between text-sm"><Link href={serviceFilterHref("/supervision/incidents", s.name)} className="truncate font-mono text-xs hover:underline">{s.name}</Link><span className="tabular-nums text-muted-foreground">{s.count}{s.open ? <b className="ml-1 text-rose-600">· {s.open} ouvert</b> : null}</span></div><div className="mt-1 h-1.5 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${(s.count / maxSvc) * 100}%` }} /></div></li>
            ))}
          </ul>
        </Panel>
        <Panel title="Indicateurs de fiabilité">
          <dl className="grid grid-cols-2 gap-3">
            {[["MTTR", d.mttrMinutes === null ? "—" : duration(d.mttrMinutes), Timer], ["Ouverts", String(d.open), Siren], ["Résolus", String(d.resolved), CheckCircle], ["30 derniers jours", String(d.last30), Clock]].map(([k, v, Icon]) => {
              const I = Icon as typeof Timer;
              return <div key={String(k)} className="rounded-xl bg-muted/60 p-3"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><I size={14} weight="duotone" aria-hidden />{String(k)}</dt><dd className="mt-1 text-xl font-extrabold tabular-nums">{String(v)}</dd></div>;
            })}
          </dl>
        </Panel>
      </div>
      <ul className="space-y-3">
        {rows.map((i) => {
          const st = incidentStatusBadge(i.status);
          const end = i.resolvedAt ? Date.parse(i.resolvedAt) : now;
          return (
            <li key={i.id}>
              <Link href={`/supervision/incidents/${i.id}`} className="flex items-stretch gap-4 rounded-2xl bg-white p-4 shadow-card dark:bg-card">
                <span className="w-1.5 shrink-0 rounded-full" style={{ background: SEV_BAR[i.severity] }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-muted-foreground">{i.incidentCode}</span><Pill tone={SEV_TONE[i.severity] ?? "zinc"}>{severityBadge(i.severity).label}</Pill><Pill tone={i.status === "RESOLVED" ? "lime" : st.tone === "warning" ? "amber" : "sky"}>{st.label}</Pill></div>
                  <p className="mt-1.5 font-semibold">{i.title}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground"><span className="font-mono">{i.serviceName}</span> · {impactScopeLabel(i.impactScope)}{i.companyName ? ` · ${i.companyName}` : ""}</p>
                </div>
                <div className="hidden shrink-0 text-right text-xs text-muted-foreground sm:block">
                  <p>{formatDateTime(i.detectedAt)}</p>
                  <p className="mt-1 font-semibold text-foreground">{i.resolvedAt ? "Durée" : "Ouvert depuis"} {duration(Math.max(0, Math.round((end - Date.parse(i.detectedAt)) / 60_000)))}</p>
                  {i.hasPostmortem && <p className="mt-1 text-lime-700">Postmortem publié</p>}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
      {pager}
    </div>
  );
}

/* ───────────── Usage ───────────── */
const CATEGORY = { booking: "Réservations", parcel: "Colis", customer: "Clients" } as const;
const CAT_COLOR = { booking: ACCENT, parcel: INFO, customer: OK } as const;
export function UsageView({ u }: { u: UsageDash }) {
  const { cur } = u;
  const cat = (k: keyof typeof CATEGORY) => cur.byDay.reduce((n, d) => n + d[k], 0);
  const total = Math.max(1, cur.totals.events);
  const maxEv = Math.max(1, ...cur.byEvent.map((e) => e.count));
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Indicateurs">
        <StatPanel label="Événements" value={formatNumber(cur.totals.events)} delta={u.deltaEvents} spark={cur.byDay.map((d) => d.booking + d.parcel + d.customer)} icon={Lightning} color={ACCENT} hint="vs période précédente" />
        <StatPanel label="Utilisateurs distincts" value={formatNumber(cur.totals.distinctUsers)} delta={u.deltaUsers} icon={UsersThree} color={INFO} hint="comptes actifs" />
        {(["booking", "parcel"] as const).map((k) => <StatPanel key={k} label={CATEGORY[k]} value={formatNumber(cat(k))} hint={`${Math.round((cat(k) / total) * 100)} % des événements`} spark={cur.byDay.map((d) => d[k])} icon={k === "booking" ? WifiHigh : HardDrives} color={CAT_COLOR[k]} />)}
      </section>
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel className="xl:col-span-2" title="Événements par jour" subtitle="Empilés par catégorie"><UsageAreaChart data={cur.byDay} /></Panel>
        <Panel title="Répartition">
          <ul className="space-y-4">
            {(["booking", "parcel", "customer"] as const).map((k) => (
              <li key={k}><div className="flex justify-between text-sm"><span className="flex items-center gap-2"><i className="size-2.5 rounded-sm" style={{ background: CAT_COLOR[k] }} />{CATEGORY[k]}</span><b className="tabular-nums">{formatNumber(cat(k))}</b></div><div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-full rounded-full" style={{ width: `${(cat(k) / total) * 100}%`, background: CAT_COLOR[k] }} /></div></li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Par événement" subtitle="Volume, jours actifs et utilisateurs distincts">
        {cur.byEvent.length === 0 ? <p className="text-sm text-muted-foreground">Aucun événement sur cette période.</p> : (
          <ul className="divide-y divide-border">
            {cur.byEvent.map((e) => (
              <li key={e.eventName} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-6 gap-y-2 py-3 md:grid-cols-[minmax(0,260px)_minmax(0,1fr)_auto_auto_auto]">
                <div className="min-w-0"><p className="truncate font-mono text-xs font-bold">{e.eventName}</p><p className="text-xs text-muted-foreground">{CATEGORY[e.eventCategory]}</p></div>
                <div className="hidden h-2 rounded-full bg-muted md:block"><div className="h-full rounded-full" style={{ width: `${(e.count / maxEv) * 100}%`, background: CAT_COLOR[e.eventCategory] }} /></div>
                <p className="text-right text-lg font-extrabold tabular-nums">{formatNumber(e.count)}</p>
                <p className="hidden w-20 text-right text-xs text-muted-foreground md:block"><b className="text-foreground">{e.activeDays}</b> jours</p>
                <p className="hidden w-24 text-right text-xs text-muted-foreground md:block"><b className="text-foreground">{e.distinctUsers}</b> utilisateurs</p>
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Calculé à partir des réservations, paiements, billets, colis et avis déjà présents. Un événement de colis ne porte pas d&apos;utilisateur. Le service conserve les événements 395 jours.</p>
      </Panel>
    </div>
  );
}
