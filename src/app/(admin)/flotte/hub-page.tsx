import {
  Armchair, Bus, CalendarCheck, CheckCircle, Coins, Gauge, MagnifyingGlass, MapPin, Path, Pulse, Storefront, TreeStructure,
  Warning, Wrench, MapTrifold, ListBullets,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { FleetsGrid, SeatMapsGrid } from "@/components/fleet/hub/fleet-cards";
import { FleetOverviewView } from "@/components/fleet/hub/fleet-overview";
import { BusesList, MaintenanceList, RoutesList, StationsList, TripsList, VendorsList } from "@/components/fleet/hub/fleet-tables";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { fleetMapRepo } from "@/lib/repos/fleet-map";
import { StationsMapLoader, TripsMapLoader } from "@/components/map/map-loaders";
import { cn } from "@/lib/utils";
import { isLive } from "@/lib/api/config";
import {
  liveBuses, liveFleetCounts, liveFleetOverview, liveFleets, liveMaintenance, liveRoutes, liveSeatMaps, liveStationCities,
  liveStations, liveTrips, liveVendors,
} from "@/lib/api/fleet-live";
import { liveCompanyNames } from "@/lib/api/sales-live";
import { FLEET_TABS, fleetHubRepo, type FleetTab } from "@/lib/repos/fleet-hub";
import { firstString } from "@/lib/search-params";

const BASE = "/flotte";
export const fleetTabPath = (t: FleetTab) => (t === "apercu" ? BASE : `${BASE}/${t}`);

const META: Record<FleetTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  apercu: { label: "Aperçu", icon: Pulse, description: "L'état de la flotte en un coup d'œil : disponibilité, alertes, départs et maintenance.", placeholder: "bus, ligne, gare, fournisseur…" },
  bus: { label: "Bus", icon: Bus, description: "Les bus de toutes les compagnies : caractéristiques, équipage et maintenance. Lecture seule, sauf la mise hors service.", placeholder: "plaque, code, modèle, conducteur…" },
  trajets: { label: "Trajets", icon: CalendarCheck, description: "Les trajets de toutes les compagnies, du plus récent au plus ancien.", placeholder: "ligne, plaque, compagnie…" },
  lignes: { label: "Lignes", icon: Path, description: "Les lignes des compagnies (origine → destination), avec leurs bus et leurs trajets.", placeholder: "ville, compagnie…" },
  gares: { label: "Gares", icon: MapPin, description: "Les gares des compagnies et le nombre de lignes qui les desservent.", placeholder: "gare, ville…" },
  flottes: { label: "Flottes", icon: TreeStructure, description: "Les sous-flottes des compagnies, leur dépôt de base et leur nombre de bus.", placeholder: "flotte, dépôt, compagnie…" },
  "plans-de-sieges": { label: "Plans de sièges", icon: Armchair, description: "Un plan par trajet : sièges libres, réservés et occupés.", placeholder: "plaque, trajet…" },
  maintenance: { label: "Maintenance", icon: Wrench, description: "Les interventions sur les bus ; le coût total est la main d'œuvre plus les pièces.", placeholder: "code, plaque, intervention, fournisseur…" },
  fournisseurs: { label: "Fournisseurs", icon: Storefront, description: "Garages, assureurs et fournisseurs de pièces des compagnies.", placeholder: "fournisseur, compagnie…" },
};

type Params = { affichage?: string | string[]; ville?: string | string[]; q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; conducteur?: string | string[] };

export async function FleetHubPage({ tab, searchParams }: { tab: FleetTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const live = isLive();
  const rawCompany = firstString(sp.compagnie);
  const companyId = live ? (rawCompany && /^[0-9a-f-]{36}$/i.test(rawCompany) ? rawCompany : undefined) : parseCompanyFilter(rawCompany);
  const co = { companyId };
  // Live: a null counter means its source failed, so the tab shows no badge.
  const liveCounts = live ? await liveFleetCounts(q || undefined, companyId) : null;
  const counts: Record<FleetTab, number> = liveCounts
    ? (Object.fromEntries(FLEET_TABS.map((t) => [t, liveCounts[t] ?? 0])) as Record<FleetTab, number>)
    : fleetHubRepo.counts(q, co);
  const meta = META[tab];
  const rawStatus = firstString(sp.statut);
  const driver = tab === "bus" ? parseFilter(firstString(sp.conducteur), ["sans"] as const) : undefined;

  // The maps need coordinates and road geometry the platform does not serve to the backoffice yet: live shows the lists.
  const mapTab = !live && (tab === "gares" || tab === "trajets");
  const view: "carte" | "liste" = live || (mapTab && firstString(sp.affichage) === "liste") ? "liste" : "carte";
  const liveCities = live && tab === "gares" ? await liveStationCities(companyId) : [];
  const cityParam = tab === "gares" ? parseFilter(firstString(sp.ville), live ? liveCities : fleetMapRepo.cities()) : undefined;

  const tabHref = (t: FleetTab) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (companyId) qs.set("compagnie", companyId);
    const text = qs.toString();
    return text ? `${fleetTabPath(t)}?${text}` : fleetTabPath(t);
  };
  const tabs: LinkTab[] = FLEET_TABS.map((t, i) => ({
    key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t),
    count: t === "apercu" || (liveCounts && liveCounts[t] === null) ? undefined : counts[t], divider: i === 1 || i === 5,
  }));

  /** Dropdown for one parameter; the other active parameters are kept. */
  const active: Record<string, string | undefined> = { q: q || undefined, compagnie: companyId, statut: rawStatus, conducteur: driver, ville: cityParam, affichage: mapTab && view === "liste" ? "liste" : undefined };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={fleetTabPath(tab)} current={current ?? "all"} options={options} keep={keep} searchable={param === "compagnie" || param === "ville"} />;
  };
  const viewSwitch = mapTab ? (
    <div role="group" aria-label="Affichage" className="inline-flex rounded-xl border border-border bg-muted/70 p-1 text-sm">
      {([["carte", "Carte", MapTrifold], ["liste", "Liste", ListBullets]] as const).map(([v, label, Icon]) => {
        const qs = new URLSearchParams();
        for (const [k, val] of Object.entries(active)) if (val && k !== "affichage") qs.set(k, val);
        if (v === "liste") qs.set("affichage", "liste");
        const text = qs.toString();
        return (
          <Link key={v} href={text ? `${fleetTabPath(tab)}?${text}` : fleetTabPath(tab)} aria-current={view === v ? "page" : undefined}
            className={cn("flex h-8 items-center gap-1.5 rounded-lg px-3 font-medium transition-colors", view === v ? "bg-card shadow-card" : "text-muted-foreground hover:text-foreground")}>
            <Icon size={16} weight="duotone" aria-hidden />{label}
          </Link>
        );
      })}
    </div>
  ) : null;
  const companyFilter = select("Compagnie", "compagnie", companyId, [{ value: "all", label: "Toutes" }, ...(live ? await liveCompanyNames() : fleetHubRepo.companies()).map((c) => ({ value: c.id, label: c.name }))]);

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = <>{companyFilter}</>;
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "apercu") {
    body = <FleetOverviewView o={live ? await liveFleetOverview(companyId) : fleetHubRepo.overview(co)} />;
  } else if (tab === "bus") {
    const status = parseFilter(rawStatus, ["active", "maintenance", "retired"] as const);
    const all = live ? await liveBuses(co) : fleetHubRepo.buses(undefined, co);
    const list = live ? await liveBuses({ ...co, q: q || undefined, status, withoutDriver: driver === "sans" }) : fleetHubRepo.buses(q, { ...co, status, withoutDriver: driver === "sans" });
    stats = [
      { label: "Bus", value: formatNumber(all.length), icon: Bus },
      { label: "En service", value: formatNumber(all.filter((b) => b.status === "active").length), icon: CheckCircle },
      { label: "En maintenance", value: formatNumber(all.filter((b) => b.status === "maintenance").length), icon: Wrench },
      { label: "Sans conducteur", value: formatNumber(all.filter((b) => b.driverName === null).length), icon: Warning },
    ];
    toolbar = (
      <>
        {companyFilter}
        {select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "active", label: "En service" }, { value: "maintenance", label: "En maintenance" }, { value: "retired", label: "Hors service" }])}
        {select("Équipage", "conducteur", driver, [{ value: "all", label: "Tous les bus" }, { value: "sans", label: "Sans conducteur" }])}
      </>
    );
    empty = list.length === 0;
    body = <BusesList rows={list} />;
  } else if (tab === "trajets") {
    const status = parseFilter(rawStatus, ["planned", "boarding", "departed", "cancelled"] as const);
    const all = live ? await liveTrips(co) : fleetHubRepo.trips(undefined, co);
    const list = live ? await liveTrips({ ...co, q: q || undefined, status }) : fleetHubRepo.trips(q, { ...co, status });
    const seats = all.reduce((n, t) => n + t.totalSeats, 0);
    const sold = all.reduce((n, t) => n + t.totalSeats - t.availableSeats, 0);
    stats = [
      { label: "Trajets", value: formatNumber(all.length), icon: CalendarCheck },
      { label: "Planifiés", value: formatNumber(all.filter((t) => t.status === "planned").length), icon: Pulse },
      { label: "Partis", value: formatNumber(all.filter((t) => t.status === "departed").length), icon: CheckCircle },
      { label: "Remplissage moyen", value: seats ? `${Math.round((sold / seats) * 100)} %` : "—", icon: Gauge },
    ];
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "planned", label: "Planifiés" }, { value: "boarding", label: "En embarquement" }, { value: "departed", label: "Partis" }, { value: "cancelled", label: "Annulés" }])}{viewSwitch}</>;
    empty = list.length === 0;
    const mapPaths = view === "carte" ? fleetMapRepo.trips(list.slice(0, 300)) : [];
    body = view === "carte" ? <TripsMapLoader paths={mapPaths} roads={fleetMapRepo.roads(mapPaths)} /> : <TripsList rows={list} />;
  } else if (tab === "lignes") {
    const list = live ? await liveRoutes({ ...co, q: q || undefined }) : fleetHubRepo.routes(q, co);
    empty = list.length === 0;
    body = <RoutesList rows={list} />;
  } else if (tab === "gares") {
    const list = live ? await liveStations({ ...co, q: q || undefined, city: cityParam }) : fleetHubRepo.stations(q, co).filter((x) => !cityParam || x.city === cityParam);
    toolbar = (
      <>
        {companyFilter}
        {select("Ville", "ville", cityParam, [{ value: "all", label: "Toutes" }, ...(live ? liveCities : fleetMapRepo.cities()).map((c) => ({ value: c, label: c }))])}
        {viewSwitch}
      </>
    );
    empty = (live || view === "liste") && list.length === 0;
    body = view === "carte" && !live ? <StationsMapLoader stations={fleetMapRepo.stations(q, { companyId, city: cityParam })} /> : <StationsList rows={list} />;
  } else if (tab === "flottes") {
    const list = live ? await liveFleets({ ...co, q: q || undefined }) : fleetHubRepo.fleets(q, co);
    empty = list.length === 0;
    body = <FleetsGrid fleets={list} />;
  } else if (tab === "plans-de-sieges") {
    const list = live ? await liveSeatMaps({ ...co, q: q || undefined }) : fleetHubRepo.seatMaps(q, co);
    empty = list.length === 0;
    body = <SeatMapsGrid maps={list} />;
  } else if (tab === "maintenance") {
    const status = parseFilter(rawStatus, ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const);
    const all = live ? await liveMaintenance(co) : fleetHubRepo.maintenance(undefined, co);
    const list = live ? await liveMaintenance({ ...co, q: q || undefined, status }) : fleetHubRepo.maintenance(q, { ...co, status });
    stats = [
      { label: "En cours", value: formatNumber(all.filter((m) => m.status === "IN_PROGRESS").length), icon: Wrench },
      { label: "Planifiées", value: formatNumber(all.filter((m) => m.status === "PLANNED").length), icon: CalendarCheck },
      { label: "Terminées", value: formatNumber(all.filter((m) => m.status === "COMPLETED").length), icon: CheckCircle },
      { label: "Coût cumulé", value: formatMoney(all.filter((m) => m.status === "COMPLETED").reduce((n, m) => n + m.totalCost, 0), all[0]?.currency ?? "XOF"), icon: Coins },
    ];
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "PLANNED", label: "Planifiées" }, { value: "IN_PROGRESS", label: "En cours" }, { value: "COMPLETED", label: "Terminées" }, { value: "CANCELLED", label: "Annulées" }])}</>;
    empty = list.length === 0;
    body = <MaintenanceList rows={list} />;
  } else {
    const list = live ? await liveVendors({ ...co, q: q || undefined }) : fleetHubRepo.vendors(q, co);
    empty = list.length === 0;
    body = <VendorsList rows={list} />;
  }

  const elsewhere = q ? FLEET_TABS.filter((t) => t !== tab && t !== "apercu" && counts[t] > 0) : [];
  const totalMatches = FLEET_TABS.reduce((n, t) => n + counts[t], 0);

  return (
    <>
      <PageHeader title="Flotte" description={meta.description} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={fleetTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {(["compagnie", "statut", "conducteur", "ville", "affichage"] as const).map((k) => {
            const v = firstString(sp[k]);
            return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
          })}
          <label>
            <span className="sr-only">Rechercher dans la flotte</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </form>
        {toolbar}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && tab !== "apercu" && (
        <p className="mb-5 text-sm text-muted-foreground">
          Résultats pour « <span className="font-medium text-foreground">{q}</span> » : <span className="font-medium tabular-nums text-foreground">{formatNumber(totalMatches)}</span> dans toute la flotte.{" "}
          <Link href={fleetTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link>
        </p>
      )}
      {!q && stats.length > 0 && <StatStrip stats={stats} />}
      {empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-medium">{q ? `Aucun résultat dans « ${meta.label} »` : "Rien à afficher ici."}</p>
          {elsewhere.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Mais ça correspond dans :{" "}
              {elsewhere.map((t, i) => <span key={t}>{i > 0 && ", "}<Link href={tabHref(t)} className="font-medium text-accent-text hover:underline">{META[t].label} ({counts[t]})</Link></span>)}
            </p>
          )}
        </div>
      ) : body}
    </>
  );
}
