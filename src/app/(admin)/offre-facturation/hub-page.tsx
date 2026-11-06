import {
  ArrowsClockwise, Coins, CreditCard, FileText, MagnifyingGlass, Medal, PuzzlePiece, Receipt, Stack, WarningCircle,
  CheckCircle, XCircle, Prohibit, Gauge, ToggleRight, Gift,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { LinkPager } from "@/components/billing/hub/link-pager";
import { FeaturesGrid } from "@/components/billing/hub/features-grid";
import { SubscriptionsTable } from "@/components/billing/hub/hub-tables";
import { InvoicesList, InvoicesSummary } from "@/components/billing/hub/invoices-table";
import { KycTypesList } from "@/components/billing/hub/kyc-types-list";
import { PaymentsFilters } from "@/components/billing/hub/payments-filters";
import { PaymentsTable } from "@/components/billing/hub/payments-table";
import { PlansGrid } from "@/components/billing/hub/plans-grid";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { TiersLadder } from "@/components/billing/hub/tiers-ladder";
import { RecoveryOverview } from "@/components/billing/hub/recovery-overview";
import { UnpaidTable } from "@/components/billing/hub/unpaid-board";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { formatMoney, formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { firstString } from "@/lib/search-params";
import { plansRepo, subscriptionsRepo } from "@/lib/repos/billing";
import { HUB_PAGE_SIZE, HUB_TABS, PAYMENT_CHANNELS, URGENCIES, hubRepo, type HubTab } from "@/lib/repos/billing-hub";
import { kycTypesRepo } from "@/lib/repos/billing";
import type { SubscriptionStatus } from "@/lib/types";
import { isLive } from "@/lib/api/config";
import {
  liveFeatures, liveHubCounts, liveInvoices, liveKycTypes, livePaymentFigures, livePayments, livePlans, liveSubscriptionFigures,
  liveSubscriptions, liveTiers, liveUnpaid,
} from "@/lib/api/billing-live";

const BASE = "/offre-facturation";
/** Path of a tab: the first one lives at the root of the section. */
export const tabPath = (t: HubTab) => (t === "plans" ? BASE : `${BASE}/${t}`);
const SUB_STATUSES = ["trial", "active", "past_due", "suspended", "expired", "canceled"] as const satisfies readonly SubscriptionStatus[];

const META: Record<HubTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  plans: { label: "Plans", icon: Stack, description: "Les offres d'abonnement vendues par Sira aux compagnies (lecture seule).", placeholder: "plan, code, fonctionnalité, prix…" },
  fonctionnalites: { label: "Fonctionnalités", icon: PuzzlePiece, description: "Catalogue des fonctionnalités que les plans peuvent inclure.", placeholder: "fonctionnalité, code, plan…" },
  paliers: { label: "Paliers", icon: Medal, description: "Remise accordée selon l'ancienneté d'une compagnie sur la plateforme.", placeholder: "palier, remise…" },
  documents: { label: "Documents KYC", icon: FileText, description: "Documents exigés pour activer une compagnie. Un type désactivé n'est plus exigé.", placeholder: "type de document, code…" },
  abonnements: { label: "Abonnements", icon: ArrowsClockwise, description: "Les abonnements des compagnies aux plans de Sira.", placeholder: "compagnie, plan, statut, prix…" },
  paiements: { label: "Paiements", icon: CreditCard, description: "Tentatives de paiement des abonnements, de la plus récente à la plus ancienne.", placeholder: "compagnie, motif, facture, montant…" },
  factures: { label: "Factures", icon: Receipt, description: "Factures d'abonnement émises par Sira aux compagnies.", placeholder: "numéro, compagnie, montant…" },
  impayes: { label: "Impayés", icon: WarningCircle, description: "Abonnements impayés ou suspendus, du plus urgent au moins urgent.", placeholder: "compagnie, plan, montant…" },
};

type Params = { urgence?: string | string[]; canal?: string | string[]; du?: string | string[]; au?: string | string[]; q?: string | string[]; statut?: string | string[]; page?: string | string[] };

export async function HubPage({ tab, searchParams }: { tab: HubTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const statut = firstString(sp.statut);
  const page = Math.max(1, Math.floor(Number(firstString(sp.page)) || 1));
  const live = isLive();
  // Live: a null counter means its source failed, so the tab shows no badge.
  const liveCounts = live ? await liveHubCounts(q) : null;
  const counts: Record<HubTab, number> = liveCounts
    ? (Object.fromEntries(HUB_TABS.map((t) => [t, liveCounts[t] ?? 0])) as Record<HubTab, number>)
    : hubRepo.counts(q);
  const meta = META[tab];

  const tabHref = (t: HubTab) => (q ? `${tabPath(t)}?${new URLSearchParams({ q }).toString()}` : tabPath(t));
  const tabs: LinkTab[] = HUB_TABS.map((t, i) => ({
    key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: liveCounts && liveCounts[t] === null ? undefined : counts[t],
    urgent: t === "impayes", divider: i === 4,
  }));
  const keep: Record<string, string> = q ? { q } : {};

  // The filter of the current tab is shown next to the search, at the top left.
  let toolbarFilter: React.ReactNode = null;
  function filter(label: string, options: { value: string; label: string }[]) {
    toolbarFilter = <FilterSelect label={label} param="statut" basePath={tabPath(tab)} current={statut ?? "all"} options={options} keep={keep} />;
    return null;
  }
  const pageParams = { q: q || undefined, statut };

  let stats: Stat[] = [];
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "plans") {
    const status = parseFilter(statut, ["active", "inactive"] as const);
    const all = live ? await livePlans() : hubRepo.plans();
    const list = live ? await livePlans(q || undefined, status) : hubRepo.plans(q, status);
    stats = [
      { label: "Plans", value: formatNumber(all.length), icon: Stack },
      { label: "Plans actifs", value: formatNumber(all.filter((p) => p.status === "active").length), icon: CheckCircle },
      { label: "Abonnements en cours", value: formatNumber(all.reduce((n, p) => n + p.liveSubscriptions, 0)), icon: ArrowsClockwise },
      { label: "Essai le plus long", value: `${Math.max(0, ...all.map((p) => p.trialDays))} jours`, icon: Gift },
    ];
    empty = list.length === 0;
    body = (
      <>
        {filter("Statut", [{ value: "all", label: "Tous" }, { value: "active", label: "Actifs" }, { value: "inactive", label: "Inactifs" }])}
        <PlansGrid plans={list.slice((page - 1) * HUB_PAGE_SIZE, page * HUB_PAGE_SIZE)} />
        <LinkPager basePath={tabPath(tab)} page={page} pageCount={Math.ceil(list.length / HUB_PAGE_SIZE)} total={list.length} size={HUB_PAGE_SIZE} params={pageParams} />
      </>
    );
  } else if (tab === "fonctionnalites") {
    const kind = parseFilter(statut, ["boolean", "quota"] as const);
    const all = live ? await liveFeatures() : hubRepo.features();
    const list = live ? await liveFeatures(q || undefined, kind) : hubRepo.features(q, kind);
    const plansForGrid = live ? (await livePlans()).map((p) => ({ id: p.id, name: p.name, status: p.status })) : plansRepo.list();
    stats = [
      { label: "Fonctionnalités", value: formatNumber(all.length), icon: PuzzlePiece },
      { label: "Activables", value: formatNumber(all.filter((f) => f.kind === "boolean").length), icon: ToggleRight },
      { label: "À quota", value: formatNumber(all.filter((f) => f.kind === "quota").length), icon: Gauge },
      { label: "Sans plan", value: formatNumber(all.filter((f) => f.plans.length === 0).length), icon: Prohibit },
    ];
    empty = list.length === 0;
    body = (
      <>
        {filter("Type", [{ value: "all", label: "Tous" }, { value: "boolean", label: "Activables" }, { value: "quota", label: "À quota" }])}
        <FeaturesGrid features={list} plans={plansForGrid} />
      </>
    );
  } else if (tab === "paliers") {
    const all = live ? await liveTiers() : hubRepo.tiers();
    const list = live ? await liveTiers(q || undefined) : hubRepo.tiers(q);
    empty = list.length === 0;
    body = <TiersLadder tiers={list} />;
  } else if (tab === "documents") {
    const f = parseFilter(statut, ["required", "optional", "inactive"] as const);
    const all = live ? await liveKycTypes() : hubRepo.kycTypes();
    const list = live ? await liveKycTypes(q || undefined, f) : hubRepo.kycTypes(q, f);
    empty = list.length === 0;
    body = (
      <>
        {filter("Type", [{ value: "all", label: "Tous" }, { value: "required", label: "Obligatoires" }, { value: "optional", label: "Facultatifs" }, { value: "inactive", label: "Désactivés" }])}
        <KycTypesList types={list} />
      </>
    );
  } else if (tab === "abonnements") {
    const status = parseFilter(statut, SUB_STATUSES);
    const all = live ? [] : hubRepo.subscriptions();
    const list = live ? await liveSubscriptions({ q: q || undefined, status }) : hubRepo.subscriptions(q, status);
    const fig = live ? await liveSubscriptionFigures() : null;
    const n = (s: SubscriptionStatus) => all.filter((x) => x.status === s).length;
    stats = [
      { label: "Abonnements", value: formatNumber(fig ? fig.total : all.length), icon: ArrowsClockwise },
      { label: "Actifs", value: formatNumber(fig ? fig.active : n("active")), icon: CheckCircle },
      { label: "En essai", value: formatNumber(fig ? fig.trial : n("trial")), icon: Gift },
      { label: "Impayés ou suspendus", value: formatNumber(fig ? fig.unpaid : n("past_due") + n("suspended")), icon: WarningCircle },
    ];
    empty = list.length === 0;
    body = (
      <SubscriptionsTable
        rows={list}
        toolbar={filter("Statut", [
          { value: "all", label: "Tous" }, { value: "trial", label: "Essai" }, { value: "active", label: "Actifs" },
          { value: "past_due", label: "Impayés" }, { value: "suspended", label: "Suspendus" },
          { value: "expired", label: "Expirés" }, { value: "canceled", label: "Annulés" },
        ])}
      />
    );
  } else if (tab === "paiements") {
    const status = parseFilter(statut, ["paid", "failed"] as const);
    const channel = parseFilter(firstString(sp.canal), PAYMENT_CHANNELS);
    const date = (raw: string | undefined) => (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined);
    const from = date(firstString(sp.du));
    const to = date(firstString(sp.au));
    const all = live ? [] : hubRepo.payments();
    const list = live ? await livePayments({ q: q || undefined, status, from, to }) : hubRepo.payments(q, { status, channel, from, to });
    const fig = live ? await livePaymentFigures() : null;
    stats = [
      { label: "Tentatives", value: formatNumber(fig ? fig.count : all.length), icon: CreditCard },
      { label: "Payées", value: formatNumber(fig ? fig.paid : all.filter((p) => p.status === "paid").length), icon: CheckCircle },
      { label: "Échouées", value: formatNumber(fig ? fig.failed : all.filter((p) => p.status === "failed").length), icon: XCircle },
      { label: "Montant encaissé", value: formatMoney(fig ? fig.paidAmount : all.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount, 0), "XOF"), icon: Coins },
    ];
    toolbarFilter = (
      <PaymentsFilters basePath={tabPath(tab)} current={{ q, statut: status ?? "all", canal: channel ?? "all", du: from ?? "", au: to ?? "" }} />
    );
    empty = list.length === 0;
    body = <PaymentsTable rows={list} />;
  } else if (tab === "factures") {
    const status = parseFilter(statut, ["paid", "failed"] as const);
    const date = (raw: string | undefined) => (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : undefined);
    const from = date(firstString(sp.du));
    const to = date(firstString(sp.au));
    const list = live ? await liveInvoices({ q: q || undefined, status, from, to }) : hubRepo.invoices(q, { status, from, to });
    toolbarFilter = (
      <PaymentsFilters
        basePath={tabPath(tab)} channels={false}
        statuses={[{ value: "all", label: "Toutes" }, { value: "paid", label: "Payées" }, { value: "failed", label: "Échouées" }]}
        current={{ q, statut: status ?? "all", canal: "all", du: from ?? "", au: to ?? "" }}
      />
    );
    empty = list.length === 0;
    body = (
      <>
        <InvoicesSummary rows={list} />
        <InvoicesList rows={list} />
      </>
    );
  } else {
    const status = parseFilter(statut, ["past_due", "suspended"] as const);
    const urgency = parseFilter(firstString(sp.urgence), URGENCIES);
    const all = live ? await liveUnpaid({ q: q || undefined }) : hubRepo.unpaid(q);
    const list = live ? await liveUnpaid({ q: q || undefined, status, urgency }) : hubRepo.unpaid(q, { status, urgency });
    toolbarFilter = (
      <>
        <FilterSelect label="Statut" param="statut" basePath={tabPath(tab)} current={status ?? "all"} keep={{ ...keep, ...(urgency ? { urgence: urgency } : {}) }}
          options={[{ value: "all", label: "Tous" }, { value: "past_due", label: "Impayés" }, { value: "suspended", label: "Suspendus" }]} />
        <FilterSelect label="Urgence" param="urgence" basePath={tabPath(tab)} current={urgency ?? "all"} keep={{ ...keep, ...(status ? { statut: status } : {}) }}
          options={[{ value: "all", label: "Toutes" }, { value: "critical", label: "Critique" }, { value: "soon", label: "Bientôt" }, { value: "normal", label: "À surveiller" }]} />
      </>
    );
    empty = all.length === 0;
    body = (
      <>
        <RecoveryOverview rows={all} />
        {list.length === 0 ? <p className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-12 text-center text-sm text-muted-foreground">Aucun dossier pour ces critères.</p> : <UnpaidTable rows={list} />}
      </>
    );
  }

  const elsewhere = q ? HUB_TABS.filter((t) => t !== tab && counts[t] > 0) : [];

  return (
    <>
      <PageHeader
        title="Offre et facturation" description={meta.description}
      />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={tabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {statut && <input type="hidden" name="statut" value={statut} />}
          {(["canal", "du", "au", "urgence"] as const).map((k) => {
            const v = firstString(sp[k]);
            return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
          })}
          <label>
            <span className="sr-only">Rechercher dans l&apos;offre et la facturation</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30"
            />
          </label>
        </form>
        {toolbarFilter}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && (
        <p className="mb-5 text-sm text-muted-foreground">
          Résultats pour « <span className="font-medium text-foreground">{q}</span> » :{" "}
          <span className="font-medium tabular-nums text-foreground">{formatNumber(HUB_TABS.reduce((n, t) => n + counts[t], 0))}</span> dans toute l&apos;offre et la facturation.{" "}
          <Link href={tabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link>
        </p>
      )}
      {!q && stats.length > 0 && <StatStrip stats={stats} />}
      {empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-medium">{q ? `Aucun résultat dans « ${meta.label} »` : "Rien à afficher ici."}</p>
          {elsewhere.length > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              Mais ça correspond dans :{" "}
              {elsewhere.map((t, i) => (
                <span key={t}>{i > 0 && ", "}<Link href={tabHref(t)} className="font-medium text-accent-text hover:underline">{META[t].label} ({counts[t]})</Link></span>
              ))}
            </p>
          )}
        </div>
      ) : body}
    </>
  );
}
