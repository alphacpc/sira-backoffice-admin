import { ChatCircleText, CheckCircle, Coins, Crown, MagnifyingGlass, Package, Prohibit, Pulse, Star, Truck, Users, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { RatingSummary, ProgramsGrid, ReviewsGrid } from "@/components/care/hub/care-cards";
import { CareOverviewView } from "@/components/care/hub/care-overview";
import { CustomersList, ParcelsList } from "@/components/care/hub/care-tables";
import { LinkPager } from "@/components/billing/hub/link-pager";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { isLive } from "@/lib/api/config";
import {
  liveCareCounts, liveCareOverview, liveCustomerStats, liveCustomers, liveFeedbackSummary, liveFeedbacks, liveParcelStats, liveParcels,
  livePrograms, liveTierDistribution,
} from "@/lib/api/care-live";
import { liveCompanyNames } from "@/lib/api/sales-live";
import { parseFilter } from "@/lib/filters";
import { formatMoney, formatNumber } from "@/lib/format";
import { CARE_TABS, TIERS, careHubRepo, type CareTab } from "@/lib/repos/care-hub";
import { fleetHubRepo } from "@/lib/repos/fleet-hub";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { PARCEL_STATUSES } from "@/lib/repos/parcels";
import { FEEDBACK_STATUSES } from "@/lib/repos/clients";
import { firstString } from "@/lib/search-params";

const BASE = "/colis-clients";
export const careTabPath = (t: CareTab) => (t === "apercu" ? BASE : `${BASE}/${t}`);
const PAGE = 12;

const META: Record<CareTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  apercu: { label: "Aperçu", icon: Pulse, description: "Le suivi des colis et la relation client en un coup d'œil : flux, retards, fidélité et satisfaction.", placeholder: "colis, client, avis…" },
  colis: { label: "Colis", icon: Package, description: "Colis confiés aux compagnies, avec leur suivi étape par étape. Le téléphone du destinataire reste masqué.", placeholder: "code, suivi, expéditeur, destinataire, trajet…" },
  comptes: { label: "Clients", icon: Users, description: "Voyageurs inscrits en libre-service, avec leurs points, leurs colis et leurs avis. Aucun e-mail ni téléphone n'est affiché.", placeholder: "nom, palier…" },
  fidelite: { label: "Fidélité", icon: Crown, description: "Programmes de fidélité des compagnies. Les points sont crédités à chaque réservation en ligne payée.", placeholder: "programme, compagnie…" },
  avis: { label: "Avis", icon: ChatCircleText, description: "Avis des voyageurs sur les trajets, les colis et le service, du plus récent au plus ancien.", placeholder: "titre, client, compagnie…" },
};

type Params = { q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; type?: string | string[]; palier?: string | string[]; profil?: string | string[]; note?: string | string[]; page?: string | string[] };

export async function CareHubPage({ tab, searchParams }: { tab: CareTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const live = isLive();
  const rawCompany = firstString(sp.compagnie);
  const companyId = live ? (rawCompany && /^[0-9a-f-]{36}$/i.test(rawCompany) ? rawCompany : undefined) : parseCompanyFilter(rawCompany);
  const co = { companyId };
  // Live: a null counter means its source failed, so the tab shows no badge.
  const liveCounts = live ? await liveCareCounts(q || undefined, companyId) : null;
  const counts: Record<CareTab, number> = liveCounts
    ? { apercu: 0, colis: liveCounts.colis ?? 0, comptes: liveCounts.comptes ?? 0, fidelite: liveCounts.fidelite ?? 0, avis: liveCounts.avis ?? 0 }
    : careHubRepo.counts(q, co);
  const meta = META[tab];
  const rawStatus = firstString(sp.statut);
  const page = Math.max(1, Math.floor(Number(firstString(sp.page)) || 1));
  const parcelType = tab === "colis" ? parseFilter(firstString(sp.type), ["DOCUMENT", "PACKAGE", "FRAGILE", "PERISHABLE", "OTHER"] as const) : undefined;
  const tier = tab === "comptes" ? parseFilter(firstString(sp.palier), TIERS) : undefined;
  const profile = tab === "comptes" ? parseFilter(firstString(sp.profil), ["entreprise", "particulier"] as const) : undefined;
  const ratingRaw = Number(firstString(sp.note));
  const rating = tab === "avis" && [1, 2, 3, 4, 5].includes(ratingRaw) ? ratingRaw : undefined;

  const tabHref = (t: CareTab) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (companyId) qs.set("compagnie", companyId);
    const text = qs.toString();
    return text ? `${careTabPath(t)}?${text}` : careTabPath(t);
  };
  const tabs: LinkTab[] = CARE_TABS.map((t, i) => ({ key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: t === "apercu" || (liveCounts && liveCounts[t] === null) ? undefined : counts[t], divider: i === 1 }));

  const active: Record<string, string | undefined> = { q: q || undefined, compagnie: companyId, statut: rawStatus, type: parcelType, palier: tier, profil: profile, note: rating ? String(rating) : undefined };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={careTabPath(tab)} current={current ?? "all"} options={options} keep={keep} searchable={param === "compagnie"} />;
  };
  const companyFilter = select("Compagnie", "compagnie", companyId, [{ value: "all", label: "Toutes" }, ...(live ? await liveCompanyNames() : fleetHubRepo.companies()).map((c) => ({ value: c.id, label: c.name }))]);

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = tab === "comptes" ? null : <>{companyFilter}</>;
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "apercu") {
    body = <CareOverviewView o={live ? await liveCareOverview(companyId) : careHubRepo.overview(co)} />;
  } else if (tab === "colis") {
    const status = parseFilter(rawStatus, PARCEL_STATUSES);
    const all = live ? [] : careHubRepo.parcels(undefined, co);
    const list = live ? await liveParcels({ q: q || undefined, companyId, status, type: parcelType }) : careHubRepo.parcels(q, { ...co, status, type: parcelType });
    const ps = live ? await liveParcelStats(companyId) : null;
    stats = live ? (ps ? [
      { label: "Colis", value: formatNumber(ps.total), icon: Package },
      { label: "En circulation", value: formatNumber(ps.inCirculation), icon: Truck },
      { label: "Livrés", value: formatNumber(ps.delivered), icon: CheckCircle },
      { label: "En retard", value: formatNumber(ps.late), icon: Warning },
    ] : []) : [
      { label: "Colis", value: formatNumber(all.length), icon: Package },
      { label: "En circulation", value: formatNumber(all.filter((p) => p.status === "IN_TRANSIT" || p.status === "AT_HUB").length), icon: Truck },
      { label: "Livrés", value: formatNumber(all.filter((p) => p.status === "DELIVERED").length), icon: CheckCircle },
      { label: "En retard", value: formatNumber(all.filter((p) => p.late).length), icon: Warning },
    ];
    toolbar = (
      <>
        {companyFilter}
        {select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "PENDING", label: "En attente" }, { value: "IN_TRANSIT", label: "En transit" }, { value: "AT_HUB", label: "Au hub" }, { value: "DELIVERED", label: "Livrés" }, { value: "CANCELLED", label: "Annulés" }, { value: "RETURNED", label: "Retournés" }, { value: "LOST", label: "Perdus" }])}
        {select("Contenu", "type", parcelType, [{ value: "all", label: "Tous" }, { value: "DOCUMENT", label: "Document" }, { value: "PACKAGE", label: "Colis" }, { value: "FRAGILE", label: "Fragile" }, { value: "PERISHABLE", label: "Périssable" }, { value: "OTHER", label: "Autre" }])}
      </>
    );
    empty = list.length === 0;
    body = <ParcelsList rows={list} />;
  } else if (tab === "comptes") {
    const status = parseFilter(rawStatus, ["active", "suspended"] as const);
    const corporate = profile === undefined ? undefined : profile === "entreprise";
    const all = live ? [] : careHubRepo.customers();
    // Live: the platform filters on the search text only; tier and profile are applied here.
    const list = live
      ? (await liveCustomers(q || undefined)).filter((c) => (!tier || c.tier === tier) && (corporate === undefined || c.isCorporate === corporate))
      : careHubRepo.customers(q, { status, tier, corporate });
    const cs = live ? await liveCustomerStats() : null;
    stats = live ? (cs ? [
      { label: "Clients", value: formatNumber(cs.total), icon: Users },
      { label: "Entreprises", value: formatNumber(cs.corporate), icon: Crown },
      { label: "Points distribués", value: formatNumber(cs.totalPoints), icon: Coins },
    ] : []) : [
      { label: "Clients", value: formatNumber(all.length), icon: Users },
      { label: "Entreprises", value: formatNumber(all.filter((c) => c.isCorporate).length), icon: Crown },
      { label: "Points distribués", value: formatNumber(all.reduce((n, c) => n + c.totalPoints, 0)), icon: Coins },
      { label: "Comptes suspendus", value: formatNumber(all.filter((c) => c.userStatus === "suspended").length), icon: Prohibit },
    ];
    toolbar = (
      <>
        {select("Palier", "palier", tier, [{ value: "all", label: "Tous" }, { value: "REGULAR", label: "Regular" }, { value: "VIP", label: "VIP" }, { value: "PREMIUM", label: "Premium" }])}
        {select("Profil", "profil", profile, [{ value: "all", label: "Tous" }, { value: "particulier", label: "Particuliers" }, { value: "entreprise", label: "Entreprises" }])}
        {!live && select("Compte", "statut", status, [{ value: "all", label: "Tous" }, { value: "active", label: "Actifs" }, { value: "suspended", label: "Suspendus" }])}
      </>
    );
    empty = list.length === 0;
    body = <CustomersList rows={list} live={live} />;
  } else if (tab === "fidelite") {
    const list = live ? await livePrograms({ q: q || undefined, companyId }) : careHubRepo.programs(q, co);
    const tiers = live ? await liveTierDistribution(companyId) : careHubRepo.overview(co).customers.tiers;
    empty = list.length === 0;
    body = <ProgramsGrid programs={list} tiers={tiers} />;
  } else {
    const status = parseFilter(rawStatus, FEEDBACK_STATUSES);
    const all = live ? [] : careHubRepo.feedbacks(undefined, co);
    const list = live ? await liveFeedbacks({ q: q || undefined, companyId, status, rating }) : careHubRepo.feedbacks(q, { ...co, status, rating });
    // Live: the rating summary comes from the platform (company filter only, not the list filters).
    const summary = live ? await liveFeedbackSummary(companyId) : null;
    const dist = summary ? [1, 2, 3, 4, 5].map((r) => summary.distribution[r - 1] ?? 0) : [1, 2, 3, 4, 5].map((r) => (live ? list : all).filter((x) => x.rating === r).length);
    const sourceRows = live ? list : all;
    const average = summary ? summary.average : sourceRows.length ? Math.round((sourceRows.reduce((n, x) => n + x.rating, 0) / sourceRows.length) * 10) / 10 : null;
    const ratingTotal = summary ? summary.total : sourceRows.length;
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "PENDING", label: "En attente" }, { value: "REVIEWED", label: "Examinés" }, { value: "RESOLVED", label: "Résolus" }, { value: "IGNORED", label: "Ignorés" }])}</>;
    const ratingHref = (r: number | null) => {
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(active)) if (v && k !== "note") qs.set(k, v);
      if (r) qs.set("note", String(r));
      const text = qs.toString();
      return text ? `${careTabPath("avis")}?${text}` : careTabPath("avis");
    };
    empty = list.length === 0;
    body = (
      <>
        <RatingSummary average={average} total={ratingTotal} distribution={dist} ratingHref={ratingHref} current={rating} />
        {empty ? null : (
          <>
            <ReviewsGrid reviews={list.slice((page - 1) * PAGE, page * PAGE)} />
            <LinkPager basePath={careTabPath("avis")} page={page} pageCount={Math.ceil(list.length / PAGE)} total={list.length} size={PAGE} params={{ q: q || undefined, compagnie: companyId, statut: status, note: rating ? String(rating) : undefined }} />
          </>
        )}
      </>
    );
    empty = false;
  }

  const elsewhere = q ? CARE_TABS.filter((t) => t !== tab && t !== "apercu" && counts[t] > 0) : [];
  const totalMatches = CARE_TABS.reduce((n, t) => n + counts[t], 0);
  return (
    <>
      <PageHeader title="Colis et clients" description={meta.description} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={careTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {(["compagnie", "statut", "type", "palier", "profil", "note"] as const).map((k) => {
            const v = firstString(sp[k]);
            return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
          })}
          <label>
            <span className="sr-only">Rechercher dans les colis et les clients</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
          </label>
        </form>
        {toolbar}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && tab !== "apercu" && (
        <p className="mb-5 text-sm text-muted-foreground">Résultats pour « <span className="font-medium text-foreground">{q}</span> » : <span className="font-medium tabular-nums text-foreground">{formatNumber(totalMatches)}</span> au total.{" "}<Link href={careTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link></p>
      )}
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
