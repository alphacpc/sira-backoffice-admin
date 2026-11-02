import { CalendarCheck, CheckCircle, Clock, Eye, FileText, Handshake, ListMagnifyingGlass, MagnifyingGlass, Prohibit, Pulse, ShieldCheck, Timer, UsersThree, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { AccessList, AuditList } from "@/components/compliance/hub/comp-tables";
import { ConsentsGrid, RequestsGrid, RetentionGrid } from "@/components/compliance/hub/comp-cards";
import { ComplianceOverviewView } from "@/components/compliance/hub/comp-overview";
import { ConsentLookup } from "@/components/compliance/consent-lookup";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { parseFilter } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { ACCESS_TYPES, AUDIT_ACTIONS, DATA_CATEGORIES, DSR_STATUSES, DSR_TYPES, consentsRepo, dsrRepo } from "@/lib/repos/compliance";
import { COMPLIANCE_TABS, complianceHubRepo, type ComplianceTab } from "@/lib/repos/compliance-hub";
import { fleetHubRepo } from "@/lib/repos/fleet-hub";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { firstString } from "@/lib/search-params";

const BASE = "/conformite";
export const complianceTabPath = (t: ComplianceTab) => (t === "apercu" ? BASE : `${BASE}/${t}`);

const META: Record<ComplianceTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  apercu: { label: "Aperçu", icon: Pulse, description: "Le point sur la conformité : journal, accès aux données, demandes RGPD, consentements et rétention.", placeholder: "acteur, demande, consentement…" },
  "journal-audit": { label: "Journal d'audit", icon: FileText, description: "Actions sensibles de toute la plateforme, de la plus récente à la plus ancienne. Journal en lecture seule ; les adresses IP sont tronquées.", placeholder: "acteur, objet, service…" },
  "acces-donnees": { label: "Accès aux données", icon: Eye, description: "Qui a consulté, exporté ou modifié des données personnelles, pour quel motif. Lecture seule ; IP tronquées.", placeholder: "agent, personne, motif…" },
  "demandes-rgpd": { label: "Demandes RGPD", icon: Handshake, description: "Droits des personnes concernées. Le délai légal de traitement est de 30 jours.", placeholder: "demandeur, compagnie, type…" },
  consentements: { label: "Consentements", icon: UsersThree, description: "États courants par type et par portée. L'historique d'une personne se consulte avec un motif d'accès déclaré et journalisé.", placeholder: "type, compagnie…" },
  retention: { label: "Rétention", icon: Timer, description: "Un job quotidien (03:15 UTC) efface l'IP et l'agent utilisateur des lignes plus anciennes que la durée de leur compagnie. Les lignes ne sont jamais supprimées. Raccourcir une durée est irréversible.", placeholder: "compagnie…" },
};

type Params = { q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; action?: string | string[]; type?: string | string[]; categorie?: string | string[]; retard?: string | string[]; duree?: string | string[] };

export async function ComplianceHubPage({ tab, searchParams }: { tab: ComplianceTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const companyId = parseCompanyFilter(firstString(sp.compagnie));
  const co = { companyId };
  const now = new Date();
  const counts = complianceHubRepo.counts(q, co);
  const meta = META[tab];
  const action = tab === "journal-audit" ? parseFilter(firstString(sp.action), AUDIT_ACTIONS) : undefined;
  const type = parseFilter(firstString(sp.type), tab === "acces-donnees" ? ACCESS_TYPES : DSR_TYPES);
  const category = tab === "acces-donnees" ? parseFilter(firstString(sp.categorie), DATA_CATEGORIES) : undefined;
  const status = tab === "demandes-rgpd" ? parseFilter(firstString(sp.statut), DSR_STATUSES) : undefined;
  const late = tab === "demandes-rgpd" ? parseFilter(firstString(sp.retard), ["oui"] as const) : undefined;
  const custom = tab === "retention" ? parseFilter(firstString(sp.duree), ["personnalisee", "defaut"] as const) : undefined;

  const tabHref = (t: ComplianceTab) => {
    const qs = new URLSearchParams();
    if (q) qs.set("q", q);
    if (companyId && t !== "acces-donnees" && t !== "consentements") qs.set("compagnie", companyId);
    const text = qs.toString();
    return text ? `${complianceTabPath(t)}?${text}` : complianceTabPath(t);
  };
  const tabs: LinkTab[] = COMPLIANCE_TABS.map((t, i) => ({
    key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: t === "apercu" ? undefined : counts[t], divider: i === 1,
    urgent: t === "demandes-rgpd",
  }));

  const active: Record<string, string | undefined> = { q: q || undefined, compagnie: companyId, action, type, categorie: category, statut: status, retard: late, duree: custom };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={complianceTabPath(tab)} current={current ?? "all"} options={options} keep={keep} searchable={param === "compagnie"} />;
  };
  const companyFilter = select("Compagnie", "compagnie", companyId, [{ value: "all", label: "Toutes" }, ...fleetHubRepo.companies().map((c) => ({ value: c.id, label: c.name }))]);

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = null;
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "apercu") {
    toolbar = companyFilter;
    body = <ComplianceOverviewView o={complianceHubRepo.overview(co, now)} />;
  } else if (tab === "journal-audit") {
    const all = complianceHubRepo.journal(undefined, co);
    const list = complianceHubRepo.journal(q, { ...co, action });
    stats = [
      { label: "Lignes", value: formatNumber(all.length), icon: FileText },
      { label: "Connexions", value: formatNumber(all.filter((a) => a.action === "LOGIN").length), icon: CheckCircle },
      { label: "Échecs de connexion", value: formatNumber(all.filter((a) => a.action === "LOGIN_FAILED").length), icon: Prohibit },
      { label: "Permissions modifiées", value: formatNumber(all.filter((a) => a.action === "PERMISSION_CHANGE").length), icon: ShieldCheck },
    ];
    toolbar = <>{companyFilter}{select("Action", "action", action, [{ value: "all", label: "Toutes" }, { value: "CREATE", label: "Création" }, { value: "UPDATE", label: "Modification" }, { value: "LOGIN", label: "Connexion" }, { value: "LOGIN_FAILED", label: "Échec de connexion" }, { value: "PERMISSION_CHANGE", label: "Changement de permission" }])}</>;
    empty = list.length === 0;
    body = <AuditList rows={list} />;
  } else if (tab === "acces-donnees") {
    const accessType = parseFilter(firstString(sp.type), ACCESS_TYPES);
    const all = complianceHubRepo.access();
    const list = complianceHubRepo.access(q, { type: accessType, category });
    stats = [
      { label: "Accès", value: formatNumber(all.length), icon: Eye },
      { label: "Consultations", value: formatNumber(all.filter((a) => a.accessType === "VIEW").length), icon: ListMagnifyingGlass },
      { label: "Exports", value: formatNumber(all.filter((a) => a.accessType === "EXPORT").length), icon: FileText },
      { label: "Modifications", value: formatNumber(all.filter((a) => a.accessType === "MODIFY").length), icon: Warning },
    ];
    toolbar = <>
      {select("Accès", "type", accessType, [{ value: "all", label: "Tous" }, { value: "VIEW", label: "Consultations" }, { value: "EXPORT", label: "Exports" }, { value: "MODIFY", label: "Modifications" }])}
      {select("Donnée", "categorie", category, [{ value: "all", label: "Toutes" }, { value: "IDENTITY", label: "Identité" }, { value: "CONSENT", label: "Consentement" }])}
    </>;
    empty = list.length === 0;
    body = <AccessList rows={list} />;
  } else if (tab === "demandes-rgpd") {
    const st = dsrRepo.stats(now);
    const list = complianceHubRepo.requests(q, { ...co, status, type: type as never, overdueOnly: late === "oui" }, now);
    stats = [
      { label: "Ouvertes", value: formatNumber(st.open), icon: Handshake },
      { label: "En retard", value: formatNumber(st.overdue), icon: Warning },
      { label: "Sous 7 jours", value: formatNumber(st.dueSoon), icon: CalendarCheck },
      { label: "Closes", value: formatNumber(st.closed), icon: CheckCircle },
    ];
    toolbar = <>
      {companyFilter}
      {select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "RECEIVED", label: "Reçues" }, { value: "IN_PROGRESS", label: "En cours" }, { value: "COMPLETED", label: "Clôturées" }, { value: "REJECTED", label: "Rejetées" }])}
      {select("Type", "type", type, [{ value: "all", label: "Tous" }, { value: "ACCESS", label: "Accès" }, { value: "RECTIFICATION", label: "Rectification" }, { value: "ERASURE", label: "Effacement" }, { value: "PORTABILITY", label: "Portabilité" }, { value: "RESTRICTION", label: "Limitation" }, { value: "OBJECTION", label: "Opposition" }])}
      {select("Échéance", "retard", late, [{ value: "all", label: "Toutes" }, { value: "oui", label: "En retard" }])}
    </>;
    empty = list.length === 0;
    body = <RequestsGrid rows={list} />;
  } else if (tab === "consentements") {
    const list = complianceHubRepo.consents(q);
    empty = list.length === 0;
    body = (
      <div className="space-y-6">
        {empty ? null : <ConsentsGrid cards={list} />}
        <section className="rounded-2xl bg-white p-6 shadow-card dark:bg-card" aria-label="Historique d'une personne">
          <h3 className="mb-1 font-semibold">Consulter l&apos;historique d&apos;une personne</h3>
          <p className="mb-4 text-sm text-muted-foreground">La consultation est enregistrée dans le journal d&apos;accès aux données, avec le motif choisi. Les lignes « Sans compagnie (ancien) » n&apos;autorisent aucun envoi.</p>
          <ConsentLookup users={consentsRepo.userOptions()} />
        </section>
      </div>
    );
    empty = false;
  } else {
    const all = complianceHubRepo.retention(undefined, co, now);
    const list = complianceHubRepo.retention(q, { ...co, custom: custom === undefined ? undefined : custom === "personnalisee" }, now);
    stats = [
      { label: "Compagnies", value: formatNumber(all.length), icon: UsersThree },
      { label: "Durée personnalisée", value: formatNumber(all.filter((r) => r.isCustom).length), icon: Timer },
      { label: "Lignes anciennes", value: formatNumber(all.reduce((n, r) => n + r.olderRows, 0)), icon: Clock },
      { label: "À anonymiser", value: formatNumber(all.reduce((n, r) => n + r.pendingRows, 0)), icon: Warning },
    ];
    toolbar = <>{companyFilter}{select("Durée", "duree", custom, [{ value: "all", label: "Toutes" }, { value: "personnalisee", label: "Personnalisée" }, { value: "defaut", label: "Par défaut" }])}</>;
    empty = list.length === 0;
    body = <RetentionGrid rows={list} />;
  }

  const elsewhere = q ? COMPLIANCE_TABS.filter((t) => t !== tab && t !== "apercu" && counts[t] > 0) : [];
  const totalMatches = COMPLIANCE_TABS.reduce((n, t) => n + counts[t], 0);
  const hiddenKeys = ["compagnie", "statut", "action", "type", "categorie", "retard", "duree"] as const;
  return (
    <>
      <PageHeader title="Conformité et audit" description={meta.description} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={complianceTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {hiddenKeys.map((k) => { const v = firstString(sp[k]); return v ? <input key={k} type="hidden" name={k} value={v} /> : null; })}
          <label>
            <span className="sr-only">Rechercher dans la conformité</span>
            <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher partout : ${meta.placeholder}`}
              className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
          </label>
        </form>
        {toolbar}
      </div>
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && tab !== "apercu" && <p className="mb-5 text-sm text-muted-foreground">Résultats pour « <span className="font-medium text-foreground">{q}</span> » : <span className="font-medium tabular-nums text-foreground">{formatNumber(totalMatches)}</span> au total.{" "}<Link href={complianceTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link></p>}
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
