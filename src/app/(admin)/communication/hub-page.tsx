import { Bell, CalendarBlank, CheckCircle, Clock, Envelope, Megaphone, MagnifyingGlass, PaperPlaneTilt, Pulse, Target, Users, Warning, XCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { CampaignsGrid, MessagesGrid, ScheduleAgenda, SegmentsGrid } from "@/components/communication/hub/comm-cards";
import { CommOverviewView } from "@/components/communication/hub/comm-overview";
import { NotificationsList } from "@/components/communication/hub/comm-tables";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { parseFilter } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { CAMPAIGN_STATUSES, MESSAGE_STATUSES, NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, SCHEDULE_STATUSES } from "@/lib/repos/communication";
import { COMM_TABS, commHubRepo, type CommTab } from "@/lib/repos/communication-hub";
import { fleetHubRepo } from "@/lib/repos/fleet-hub";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { firstString } from "@/lib/search-params";

const BASE = "/communication";
export const commTabPath = (t: CommTab) => (t === "apercu" ? BASE : `${BASE}/${t}`);

const META: Record<CommTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  apercu: { label: "Aperçu", icon: Pulse, description: "La santé des envois, le pipeline des campagnes et les prochains départs.", placeholder: "campagne, message, segment…" },
  notifications: { label: "Notifications", icon: Bell, description: "Messages envoyés aux voyageurs et aux destinataires de colis. Le contenu est masqué.", placeholder: "code, destinataire, type…" },
  campagnes: { label: "Campagnes", icon: Megaphone, description: "Campagnes marketing des compagnies, de la plus récente à la plus ancienne.", placeholder: "campagne, compagnie…" },
  messages: { label: "Messages", icon: Envelope, description: "Messages marketing rédigés par les compagnies. Seul le canal « dans l'application » est réellement envoyé.", placeholder: "objet, texte, campagne…" },
  segments: { label: "Segments", icon: Users, description: "Ciblages des campagnes. Seul le palier de fidélité est évalué ; les éligibles sont recalculés à chaque lecture.", placeholder: "segment, ciblage…" },
  programmations: { label: "Programmations", icon: CalendarBlank, description: "Envois planifiés, présentés comme un agenda. Une programmation en attente part à l'échéance.", placeholder: "campagne, message, segment…" },
};

type Params = { q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; canal?: string | string[] };

export async function CommHubPage({ tab, searchParams }: { tab: CommTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const companyId = parseCompanyFilter(firstString(sp.compagnie));
  const co = { companyId };
  const counts = commHubRepo.counts(q, co);
  const meta = META[tab];
  const rawStatus = firstString(sp.statut);
  const channel = tab === "notifications" ? parseFilter(firstString(sp.canal), NOTIFICATION_CHANNELS) : undefined;

  const tabHref = (t: CommTab) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (companyId) qs.set("compagnie", companyId);
    const text = qs.toString();
    return text ? `${commTabPath(t)}?${text}` : commTabPath(t);
  };
  const tabs: LinkTab[] = COMM_TABS.map((t, i) => ({ key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: t === "apercu" ? undefined : counts[t], divider: i === 1 }));

  const active: Record<string, string | undefined> = { q: q || undefined, compagnie: companyId, statut: rawStatus, canal: channel };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={commTabPath(tab)} current={current ?? "all"} options={options} keep={keep} searchable={param === "compagnie"} />;
  };
  const companyFilter = select("Compagnie", "compagnie", companyId, [{ value: "all", label: "Toutes" }, ...fleetHubRepo.companies().map((c) => ({ value: c.id, label: c.name }))]);

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = <>{companyFilter}</>;
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "apercu") {
    body = <CommOverviewView o={commHubRepo.overview(co)} />;
  } else if (tab === "notifications") {
    const status = parseFilter(rawStatus, NOTIFICATION_STATUSES);
    const all = commHubRepo.notifications(undefined, co);
    const list = commHubRepo.notifications(q, { ...co, channel, status });
    stats = [
      { label: "Notifications", value: formatNumber(all.length), icon: Bell },
      { label: "Envoyées", value: formatNumber(all.filter((n) => n.status === "SENT").length), icon: CheckCircle },
      { label: "Échouées", value: formatNumber(all.filter((n) => n.status === "FAILED").length), icon: XCircle },
      { label: "En attente", value: formatNumber(all.filter((n) => n.status === "PENDING").length), icon: Clock },
    ];
    toolbar = (
      <>
        {companyFilter}
        {select("Canal", "canal", channel, [{ value: "all", label: "Tous" }, { value: "EMAIL", label: "E-mail" }, { value: "SMS", label: "SMS" }, { value: "IN_APP", label: "Dans l'application" }, { value: "PUSH", label: "Push" }, { value: "WHATSAPP", label: "WhatsApp" }])}
        {select("Statut", "statut", status, [{ value: "all", label: "Toutes" }, { value: "PENDING", label: "En attente" }, { value: "SENT", label: "Envoyées" }, { value: "FAILED", label: "Échouées" }])}
      </>
    );
    empty = list.length === 0;
    body = <NotificationsList rows={list} />;
  } else if (tab === "campagnes") {
    const status = parseFilter(rawStatus, CAMPAIGN_STATUSES);
    const all = commHubRepo.campaigns(undefined, co);
    const list = commHubRepo.campaigns(q, { ...co, status });
    stats = [
      { label: "Campagnes", value: formatNumber(all.length), icon: Megaphone },
      { label: "En cours", value: formatNumber(all.filter((c) => c.status === "RUNNING").length), icon: PaperPlaneTilt },
      { label: "Programmées", value: formatNumber(all.filter((c) => c.status === "SCHEDULED").length), icon: CalendarBlank },
      { label: "Terminées", value: formatNumber(all.filter((c) => c.status === "COMPLETED").length), icon: CheckCircle },
    ];
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Toutes" }, { value: "DRAFT", label: "Brouillons" }, { value: "SCHEDULED", label: "Programmées" }, { value: "RUNNING", label: "En cours" }, { value: "COMPLETED", label: "Terminées" }, { value: "CANCELLED", label: "Annulées" }])}</>;
    empty = list.length === 0;
    body = <CampaignsGrid campaigns={list} now={Date.now()} />;
  } else if (tab === "messages") {
    const status = parseFilter(rawStatus, MESSAGE_STATUSES);
    const list = commHubRepo.messages(q, { ...co, status });
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "DRAFT", label: "Brouillons" }, { value: "APPROVED", label: "Approuvés" }, { value: "SENT", label: "Envoyés" }])}</>;
    empty = list.length === 0;
    body = <MessagesGrid messages={list} />;
  } else if (tab === "segments") {
    const all = commHubRepo.segments(undefined, co);
    const list = commHubRepo.segments(q, co);
    stats = [
      { label: "Segments", value: formatNumber(all.length), icon: Users },
      { label: "Taille estimée", value: formatNumber(all.reduce((n, s) => n + s.estimatedSize, 0)), icon: Target },
      { label: "Éligibles aujourd'hui", value: formatNumber(all.reduce((n, s) => n + s.eligibleNow, 0)), icon: CheckCircle },
      { label: "Réutilisables", value: formatNumber(all.filter((s) => !s.campaignName).length), icon: Warning },
    ];
    empty = list.length === 0;
    body = <SegmentsGrid segments={list} />;
  } else {
    const status = parseFilter(rawStatus, SCHEDULE_STATUSES);
    const all = commHubRepo.schedules(undefined, co);
    const list = commHubRepo.schedules(q, { ...co, status });
    stats = [
      { label: "Programmations", value: formatNumber(all.length), icon: CalendarBlank },
      { label: "En attente", value: formatNumber(all.filter((s) => s.status === "PENDING").length), icon: Clock },
      { label: "Envoyées", value: formatNumber(all.filter((s) => s.status === "SENT").length), icon: PaperPlaneTilt },
      { label: "Échouées", value: formatNumber(all.filter((s) => s.status === "FAILED").length), icon: XCircle },
    ];
    toolbar = <>{companyFilter}{select("Statut", "statut", status, [{ value: "all", label: "Toutes" }, { value: "PENDING", label: "En attente" }, { value: "SENT", label: "Envoyées" }, { value: "FAILED", label: "Échouées" }, { value: "CANCELLED", label: "Annulées" }])}</>;
    empty = list.length === 0;
    body = <ScheduleAgenda schedules={list} />;
  }

  const elsewhere = q ? COMM_TABS.filter((t) => t !== tab && t !== "apercu" && counts[t] > 0) : [];
  const totalMatches = COMM_TABS.reduce((n, t) => n + counts[t], 0);
  return (
    <>
      <PageHeader title="Communication" description={meta.description} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={commTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {(["compagnie", "statut", "canal"] as const).map((k) => { const v = firstString(sp[k]); return v ? <input key={k} type="hidden" name={k} value={v} /> : null; })}
          <label>
            <span className="sr-only">Rechercher dans la communication</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
          </label>
        </form>
        {toolbar}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && tab !== "apercu" && <p className="mb-5 text-sm text-muted-foreground">Résultats pour « <span className="font-medium text-foreground">{q}</span> » : <span className="font-medium tabular-nums text-foreground">{formatNumber(totalMatches)}</span> au total.{" "}<Link href={commTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link></p>}
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
