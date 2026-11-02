import { Bug, CheckCircle, ChartLineUp, Clock, HardDrives, Lightning, MagnifyingGlass, Prohibit, Pulse, Siren, Timer, Warning, WifiHigh } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LinkPager } from "@/components/billing/hub/link-pager";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { ApiView, IncidentsView, OverviewView, ServicesView, UsageView, duration } from "@/components/monitoring/hub/mon-views";
import { DeclareIncidentButton } from "@/components/monitoring/declare-incident-button";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { parseFilter } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { fleetHubRepo } from "@/lib/repos/fleet-hub";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, servicesRepo } from "@/lib/repos/monitoring";
import { MON_TABS, WINDOWS, apiDash, fleetTimeline, incidentDash, monCounts, monOverview, serviceLatencySeries, serviceMetrics, usageDash, type MonTab } from "@/lib/repos/monitoring-hub";
import { getStore } from "@/lib/repos/store";
import { firstString } from "@/lib/search-params";

const BASE = "/supervision";
export const monTabPath = (t: MonTab) => (t === "apercu" ? BASE : `${BASE}/${t}`);
const PAGE_API = 12;
const PAGE_INC = 8;

const META: Record<MonTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  apercu: { label: "Vue d'ensemble", icon: Pulse, description: "Le tableau de bord de la plateforme : santé des services, trafic de l'API, budget d'erreur et incidents, avec comparaison à la période précédente.", placeholder: "service, endpoint, incident…" },
  services: { label: "Services", icon: HardDrives, description: "Santé de chaque microservice sur 24 heures : latence (p50, p95, maximum), disponibilité face à l'objectif et frise des contrôles.", placeholder: "nom du service…" },
  api: { label: "Trafic API", icon: WifiHigh, description: "Appels à la plateforme : volume, latence, erreurs, consommateurs et cartes de chaleur. Seuls des agrégats sont affichés, jamais d'adresse ni d'utilisateur.", placeholder: "endpoint, méthode…" },
  incidents: { label: "Incidents", icon: Siren, description: "Incidents plateforme déclarés et suivis à la main : chronologie, gravité, services touchés et délai moyen de résolution.", placeholder: "code, titre, service…" },
  usage: { label: "Usage produit", icon: ChartLineUp, description: "Événements produit par jour et par catégorie, comparés à la période précédente. Un événement de colis ne porte pas d'utilisateur.", placeholder: "événement…" },
};

type Params = { q?: string | string[]; jours?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; gravite?: string | string[]; service?: string | string[]; page?: string | string[] };

export async function MonitoringHubPage({ tab, searchParams }: { tab: MonTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const now = new Date();
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const days = Number(parseFilter(firstString(sp.jours), WINDOWS.map(String))) || 7;
  const companyId = parseCompanyFilter(firstString(sp.compagnie));
  const page = Math.max(1, Math.floor(Number(firstString(sp.page)) || 1));
  const names = servicesRepo.names();
  const serviceName = parseFilter(firstString(sp.service), names);
  const incStatus = tab === "incidents" ? parseFilter(firstString(sp.statut), INCIDENT_STATUSES) : undefined;
  const svcStatus = tab === "services" ? parseFilter(firstString(sp.statut), ["healthy", "degraded", "down", "stale"] as const) : undefined;
  const status: string | undefined = incStatus ?? svcStatus;
  const severity = tab === "incidents" ? parseFilter(firstString(sp.gravite), INCIDENT_SEVERITIES) : undefined;
  const win = { days, companyId };
  const counts = monCounts(q, win);
  const meta = META[tab];

  const tabHref = (t: MonTab) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (days !== 7 && t !== "services" && t !== "incidents") qs.set("jours", String(days));
    if (companyId && (t === "api" || t === "usage" || t === "apercu")) qs.set("compagnie", companyId);
    const text = qs.toString();
    return text ? `${monTabPath(t)}?${text}` : monTabPath(t);
  };
  const tabs: LinkTab[] = MON_TABS.map((t, i) => ({
    key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: t === "apercu" ? undefined : counts[t], divider: i === 1,
    urgent: t === "incidents",
  }));

  const active: Record<string, string | undefined> = { q: q || undefined, jours: days === 7 ? undefined : String(days), compagnie: companyId, statut: status, gravite: severity, service: serviceName };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={monTabPath(tab)} current={current ?? "all"} options={options} keep={keep} searchable={param === "compagnie"} />;
  };
  const periodFilter = select("Période", "jours", days === 7 ? undefined : String(days), [{ value: "all", label: "7 jours" }, { value: "14", label: "14 jours" }, { value: "30", label: "30 jours" }]);
  const companyFilter = select("Compagnie", "compagnie", companyId, [{ value: "all", label: "Toutes" }, ...fleetHubRepo.companies().map((c) => ({ value: c.id, label: c.name }))]);
  const serviceFilter = select("Service", "service", serviceName, [{ value: "all", label: "Tous" }, ...names.map((n) => ({ value: n, label: n }))]);

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = null;
  let body: React.ReactNode = null;
  let empty = false;
  let actions: React.ReactNode = undefined;

  if (tab === "apercu") {
    toolbar = <>{periodFilter}{companyFilter}</>;
    body = <OverviewView o={monOverview(win, now)} />;
  } else if (tab === "services") {
    const all = serviceMetrics();
    const list = serviceMetrics(q || serviceName, svcStatus).filter((m) => !serviceName || m.name === serviceName);
    const st = servicesRepo.stats();
    stats = [
      { label: "Opérationnels", value: formatNumber(st.healthy), icon: CheckCircle, hint: `sur ${all.length} services` },
      { label: "Dégradés", value: formatNumber(st.degraded), icon: Warning },
      { label: "En panne", value: formatNumber(st.down), icon: Prohibit },
      { label: "Obsolètes", value: formatNumber(st.stale), icon: Clock, hint: "plus sondés" },
    ];
    toolbar = <>{serviceFilter}{select("État", "statut", svcStatus, [{ value: "all", label: "Tous" }, { value: "healthy", label: "Opérationnels" }, { value: "degraded", label: "Dégradés" }, { value: "down", label: "En panne" }, { value: "stale", label: "Obsolètes" }])}</>;
    empty = list.length === 0;
    const shown = list.filter((m) => !m.stale);
    body = <ServicesView metrics={list} fleet={fleetTimeline()} series={serviceLatencySeries(shown.length ? shown.map((m) => m.name) : names)} names={shown.length ? shown.map((m) => m.name) : names} />;
  } else if (tab === "api") {
    const a = apiDash({ ...win, q }, now);
    const slice = a.endpoints.slice((page - 1) * PAGE_API, page * PAGE_API);
    stats = [
      { label: "Requêtes", value: formatNumber(a.totals.count), icon: Lightning, hint: `${a.totals.rps} req/s` },
      { label: "Latence moyenne", value: `${a.totals.avgResponseMs} ms`, icon: Timer, hint: `maximum ${formatNumber(a.totals.maxResponseMs)} ms` },
      { label: "Erreurs client (4xx)", value: `${a.totals.clientErrorPercent} %`, icon: Bug },
      { label: "Erreurs serveur (5xx)", value: `${a.totals.serverErrorPercent} %`, icon: Warning, hint: `disponibilité ${a.totals.availability.toFixed(2)} %` },
    ];
    toolbar = <>{periodFilter}{companyFilter}</>;
    empty = a.endpoints.length === 0;
    body = <ApiView a={a} rows={slice} pager={<LinkPager basePath={monTabPath("api")} page={page} pageCount={Math.ceil(a.endpoints.length / PAGE_API)} total={a.endpoints.length} size={PAGE_API} params={{ q: q || undefined, jours: days === 7 ? undefined : String(days), compagnie: companyId }} />} />;
  } else if (tab === "incidents") {
    const d = incidentDash({ q, status: incStatus, severity, serviceName }, now);
    stats = [
      { label: "Ouverts", value: formatNumber(d.open), icon: Siren },
      { label: "Résolus", value: formatNumber(d.resolved), icon: CheckCircle },
      { label: "MTTR", value: d.mttrMinutes === null ? "—" : duration(d.mttrMinutes), icon: Timer, hint: "délai moyen de résolution" },
      { label: "30 derniers jours", value: formatNumber(d.last30), icon: Clock, hint: "incidents détectés" },
    ];
    toolbar = <>
      {serviceFilter}
      {select("Statut", "statut", incStatus, [{ value: "all", label: "Tous" }, { value: "INVESTIGATING", label: "En investigation" }, { value: "IDENTIFIED", label: "Identifiés" }, { value: "MONITORING", label: "Sous surveillance" }, { value: "RESOLVED", label: "Résolus" }])}
      {select("Gravité", "gravite", severity, [{ value: "all", label: "Toutes" }, { value: "LOW", label: "Faible" }, { value: "MEDIUM", label: "Moyenne" }, { value: "HIGH", label: "Haute" }, { value: "CRITICAL", label: "Critique" }])}
    </>;
    actions = <DeclareIncidentButton services={names} companies={getStore().companies.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }))} />;
    empty = d.rows.length === 0;
    body = <IncidentsView d={d} now={now.getTime()} rows={d.rows.slice((page - 1) * PAGE_INC, page * PAGE_INC)} pager={<LinkPager basePath={monTabPath("incidents")} page={page} pageCount={Math.ceil(d.rows.length / PAGE_INC)} total={d.rows.length} size={PAGE_INC} params={{ q: q || undefined, statut: incStatus, gravite: severity, service: serviceName }} />} />;
  } else {
    const u = usageDash({ ...win, q }, now);
    toolbar = <>{periodFilter}{companyFilter}</>;
    body = <UsageView u={u} />;
  }

  const elsewhere = q ? MON_TABS.filter((t) => t !== tab && t !== "apercu" && counts[t] > 0) : [];
  const hidden = ["jours", "compagnie", "statut", "gravite", "service"] as const;
  return (
    <>
      <PageHeader title="Supervision" description={meta.description} actions={actions} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={monTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {hidden.map((k) => { const v = firstString(sp[k]); return v ? <input key={k} type="hidden" name={k} value={v} /> : null; })}
          <label>
            <span className="sr-only">Rechercher dans la supervision</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
          </label>
        </form>
        {toolbar}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && tab !== "apercu" && <p className="mb-5 text-sm text-muted-foreground">Résultats pour « <span className="font-medium text-foreground">{q}</span> ».{" "}<Link href={monTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link></p>}
      {!q && stats.length > 0 && <StatStrip stats={stats} />}
      {empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-medium">{q ? `Aucun résultat dans « ${meta.label} »` : "Rien à afficher ici."}</p>
          {elsewhere.length > 0 && <p className="mt-2 text-sm text-muted-foreground">Mais ça correspond dans :{" "}{elsewhere.map((t, i) => <span key={t}>{i > 0 && ", "}<Link href={tabHref(t)} className="font-medium text-accent-text hover:underline">{META[t].label} ({counts[t]})</Link></span>)}</p>}
        </div>
      ) : body}
    </>
  );
}
