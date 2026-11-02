import {
  ArrowsLeftRight, Basket, CalendarCheck, CheckCircle, CreditCard, Gauge, Globe, MagnifyingGlass, Pulse, Receipt, Ticket, Warning, XCircle,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LinkPager } from "@/components/billing/hub/link-pager";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { MethodsGrid, OnlineView, TicketsGrid } from "@/components/sales/hub/sales-cards";
import { SalesOverviewView } from "@/components/sales/hub/sales-overview";
import { BookingsList, TransactionsList } from "@/components/sales/hub/sales-tables";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { parseFilter } from "@/lib/filters";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { BOOKING_CHANNELS, BOOKING_PAYMENT_STATUSES, BOOKING_STATUSES, ONLINE_UNPAID_TTL_MINUTES, TICKET_STATUSES, TRANSACTION_STATUSES } from "@/lib/repos/sales";
import { PERIODS, SALES_TABS, salesHubRepo, type SalesTab } from "@/lib/repos/sales-hub";
import { fleetHubRepo } from "@/lib/repos/fleet-hub";
import { firstString } from "@/lib/search-params";

const BASE = "/ventes";
export const salesTabPath = (t: SalesTab) => (t === "apercu" ? BASE : `${BASE}/${t}`);
const PAGE = 12;

const META: Record<SalesTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  apercu: { label: "Aperçu", icon: Pulse, description: "Le pouls des ventes : chiffre d'affaires, conversion, lignes qui marchent et moments de réservation.", placeholder: "code, voyageur, ligne, compagnie…" },
  reservations: { label: "Réservations", icon: Receipt, description: "Réservations des voyageurs de toutes les compagnies, de la plus récente à la plus ancienne.", placeholder: "code, voyageur, ligne, siège…" },
  paiements: { label: "Paiements", icon: CreditCard, description: "Transactions en ligne et au guichet, avec les incohérences détectées.", placeholder: "référence, voyageur, moyen, montant…" },
  billets: { label: "Billets", icon: Ticket, description: "Billets émis aux voyageurs, présentés comme des cartes d'embarquement.", placeholder: "code du billet, voyageur, ligne…" },
  "moyens-de-paiement": { label: "Moyens de paiement", icon: Basket, description: "Moyens de paiement acceptés par chaque compagnie, avec leur trafic et leur taux de réussite.", placeholder: "moyen, opérateur, compagnie…" },
  "en-ligne": { label: "Libre-service", icon: Globe, description: `Réservations faites par les voyageurs eux-mêmes. Une réservation non payée expire ${ONLINE_UNPAID_TTL_MINUTES} minutes après sa création.`, placeholder: "code, voyageur, compagnie…" },
};

type Params = { q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; paiement?: string | string[]; canal?: string | string[]; anomalie?: string | string[]; periode?: string | string[]; page?: string | string[] };

export async function SalesHubPage({ tab, searchParams }: { tab: SalesTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const companyId = parseCompanyFilter(firstString(sp.compagnie));
  const co = { companyId };
  const counts = salesHubRepo.counts(q, co);
  const meta = META[tab];
  const rawStatus = firstString(sp.statut);
  const paymentStatus = tab === "reservations" ? parseFilter(firstString(sp.paiement), BOOKING_PAYMENT_STATUSES) : undefined;
  const channel = tab === "reservations" ? parseFilter(firstString(sp.canal), BOOKING_CHANNELS) : undefined;
  const anomaly = tab === "paiements" ? parseFilter(firstString(sp.anomalie), ["oui"] as const) : undefined;
  const days = Number(firstString(sp.periode));
  const period = (PERIODS as readonly number[]).includes(days) ? days : 30;
  const page = Math.max(1, Math.floor(Number(firstString(sp.page)) || 1));

  const tabHref = (t: SalesTab) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (companyId) qs.set("compagnie", companyId);
    const text = qs.toString();
    return text ? `${salesTabPath(t)}?${text}` : salesTabPath(t);
  };
  const tabs: LinkTab[] = SALES_TABS.map((t, i) => ({
    key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: t === "apercu" ? undefined : counts[t], divider: i === 1,
  }));

  const active: Record<string, string | undefined> = { q: q || undefined, compagnie: companyId, statut: rawStatus, paiement: paymentStatus, canal: channel, anomalie: anomaly, periode: tab === "apercu" ? String(period) : undefined };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={salesTabPath(tab)} current={current ?? "all"} options={options} keep={keep} searchable={param === "compagnie"} />;
  };
  const companyFilter = select("Compagnie", "compagnie", companyId, [{ value: "all", label: "Toutes" }, ...fleetHubRepo.companies().map((c) => ({ value: c.id, label: c.name }))]);

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = tab === "en-ligne" ? null : <>{companyFilter}</>;
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "apercu") {
    body = <SalesOverviewView o={salesHubRepo.overview(period, co)} periodHref={(d) => `${salesTabPath("apercu")}?${new URLSearchParams({ ...(q ? { q } : {}), ...(companyId ? { compagnie: companyId } : {}), periode: String(d) }).toString()}`} />;
  } else if (tab === "reservations") {
    const status = parseFilter(rawStatus, BOOKING_STATUSES);
    const all = salesHubRepo.bookings(undefined, co);
    const list = salesHubRepo.bookings(q, { ...co, status, paymentStatus, channel });
    stats = [
      { label: "Réservations", value: formatNumber(all.length), icon: Receipt },
      { label: "Payées", value: formatNumber(all.filter((b) => b.paymentStatus === "paid").length), icon: CheckCircle },
      { label: "En ligne", value: formatNumber(all.filter((b) => b.channel === "online").length), icon: Globe },
      { label: "Montant payé", value: formatMoney(all.filter((b) => b.paymentStatus === "paid").reduce((n, b) => n + b.amount, 0), "XOF"), icon: Gauge },
    ];
    toolbar = (
      <>
        {companyFilter}
        {select("Statut", "statut", status, [{ value: "all", label: "Toutes" }, { value: "confirmed", label: "Confirmées" }, { value: "cancelled", label: "Annulées" }])}
        {select("Paiement", "paiement", paymentStatus, [{ value: "all", label: "Tous" }, { value: "pending", label: "En attente" }, { value: "paid", label: "Payées" }, { value: "failed", label: "Échouées" }])}
        {select("Canal", "canal", channel, [{ value: "all", label: "Tous" }, { value: "counter", label: "Guichet" }, { value: "online", label: "En ligne" }])}
      </>
    );
    empty = list.length === 0;
    body = <BookingsList rows={list} />;
  } else if (tab === "paiements") {
    const status = parseFilter(rawStatus, TRANSACTION_STATUSES);
    const all = salesHubRepo.transactions(undefined, co);
    const list = salesHubRepo.transactions(q, { ...co, status, anomalyOnly: anomaly === "oui" });
    stats = [
      { label: "Transactions", value: formatNumber(all.length), icon: ArrowsLeftRight },
      { label: "Réussies", value: formatNumber(all.filter((t) => t.status === "COMPLETED").length), icon: CheckCircle },
      { label: "Échouées", value: formatNumber(all.filter((t) => t.status === "FAILED").length), icon: XCircle },
      { label: "Avec incohérence", value: formatNumber(all.filter((t) => t.anomalies.length > 0).length), icon: Warning },
    ];
    toolbar = (
      <>
        {companyFilter}
        {select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "PENDING", label: "En attente" }, { value: "COMPLETED", label: "Réussis" }, { value: "FAILED", label: "Échoués" }])}
        {select("Contrôle", "anomalie", anomaly, [{ value: "all", label: "Toutes" }, { value: "oui", label: "Avec incohérence" }])}
      </>
    );
    empty = list.length === 0;
    body = <TransactionsList rows={list} />;
  } else if (tab === "billets") {
    const status = parseFilter(rawStatus, TICKET_STATUSES);
    const all = salesHubRepo.tickets(undefined, co);
    const list = salesHubRepo.tickets(q, { ...co, status });
    stats = [
      { label: "Billets", value: formatNumber(all.length), icon: Ticket },
      { label: "Émis", value: formatNumber(all.filter((t) => t.status === "ISSUED").length), icon: CalendarCheck },
      { label: "Utilisés", value: formatNumber(all.filter((t) => t.status === "USED" || t.status === "CHECKED_IN").length), icon: CheckCircle },
      { label: "Annulés", value: formatNumber(all.filter((t) => t.status === "CANCELLED").length), icon: XCircle },
    ];
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "ISSUED", label: "Émis" }, { value: "CHECKED_IN", label: "Enregistrés" }, { value: "USED", label: "Utilisés" }, { value: "CANCELLED", label: "Annulés" }])}</>;
    empty = list.length === 0;
    body = (
      <>
        <TicketsGrid tickets={list.slice((page - 1) * PAGE, page * PAGE)} />
        <LinkPager basePath={salesTabPath(tab)} page={page} pageCount={Math.ceil(list.length / PAGE)} total={list.length} size={PAGE} params={{ q: q || undefined, compagnie: companyId, statut: status }} />
      </>
    );
  } else if (tab === "moyens-de-paiement") {
    const all = salesHubRepo.methods(undefined, co);
    const list = salesHubRepo.methods(q, co);
    stats = [
      { label: "Moyens de paiement", value: formatNumber(all.length), icon: Basket },
      { label: "Actifs", value: formatNumber(all.filter((m) => m.active).length), icon: CheckCircle },
      { label: "Transactions", value: formatNumber(all.reduce((n, m) => n + m.transactions, 0)), icon: ArrowsLeftRight },
      { label: "Échecs", value: formatNumber(all.reduce((n, m) => n + m.failed, 0)), icon: XCircle },
    ];
    empty = list.length === 0;
    body = <MethodsGrid methods={list} />;
  } else {
    body = <OnlineView stats={salesHubRepo.online()} ttl={ONLINE_UNPAID_TTL_MINUTES} />;
  }

  const elsewhere = q ? SALES_TABS.filter((t) => t !== tab && t !== "apercu" && counts[t] > 0) : [];
  const totalMatches = SALES_TABS.reduce((n, t) => n + counts[t], 0);

  return (
    <>
      <PageHeader title="Ventes et paiements" description={meta.description} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={salesTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {(["compagnie", "statut", "paiement", "canal", "anomalie", "periode"] as const).map((k) => {
            const v = firstString(sp[k]);
            return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
          })}
          <label>
            <span className="sr-only">Rechercher dans les ventes</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
          </label>
        </form>
        {toolbar}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && tab !== "apercu" && (
        <p className="mb-5 text-sm text-muted-foreground">
          Résultats pour « <span className="font-medium text-foreground">{q}</span> » : <span className="font-medium tabular-nums text-foreground">{formatNumber(totalMatches)}</span> dans toutes les ventes.{" "}
          <Link href={salesTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link>
        </p>
      )}
      {!q && stats.length > 0 && <StatStrip stats={stats} />}
      {empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-medium">{q ? `Aucun résultat dans « ${meta.label} »` : "Rien à afficher ici."}</p>
          {elsewhere.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">Mais ça correspond dans :{" "}{elsewhere.map((t, i) => <span key={t}>{i > 0 && ", "}<Link href={tabHref(t)} className="font-medium text-accent-text hover:underline">{META[t].label} ({counts[t]})</Link></span>)}</p>
          )}
        </div>
      ) : body}
    </>
  );
}
