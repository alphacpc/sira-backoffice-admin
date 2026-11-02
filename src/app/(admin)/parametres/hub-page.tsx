import { Clock, Eye, Key, MagnifyingGlass, Palette, ShieldCheck, ShieldWarning, UserCircle, Users, UsersThree } from "@phosphor-icons/react/dist/ssr";
import { notFound } from "next/navigation";
import Link from "next/link";
import { LinkPager } from "@/components/billing/hub/link-pager";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { InviteAdminButton } from "@/components/settings/invite-admin-button";
import { ProfileActions } from "@/components/settings/profile-actions";
import { JournalView, PreferencesView, ProfileView, SecurityView, TeamView } from "@/components/settings/hub/views";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { requireSession } from "@/lib/auth/session";
import { parseFilter } from "@/lib/filters";
import { formatNumber } from "@/lib/format";
import { ADMIN_STATUSES, JOURNAL_WINDOWS, journalRepo, profileRepo } from "@/lib/repos/backoffice";
import { SETTINGS_TABS, journalGroups, myChecks, posture, settingsCounts, team, type SettingsTab } from "@/lib/repos/settings-hub";
import { firstString } from "@/lib/search-params";

const BASE = "/parametres";
export const settingsTabPath = (t: SettingsTab) => `${BASE}/${t}`;
const PAGE = 20;

const META: Record<SettingsTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  profil: { label: "Mon profil", icon: UserCircle, description: "Ton compte administrateur : identité, sécurité, sessions et codes de récupération.", placeholder: "" },
  "equipe-admin": { label: "Équipe", icon: Users, description: "Administrateurs du backoffice : invitations, suspensions, réinitialisation du TOTP et sessions. Le TOTP est obligatoire.", placeholder: "nom, identifiant…" },
  securite: { label: "Sécurité", icon: ShieldCheck, description: "La posture de sécurité de l'équipe : couverture 2FA, comptes à surveiller et politiques appliquées.", placeholder: "" },
  "journal-backoffice": { label: "Journal", icon: Clock, description: "Actions des administrateurs, de la plus récente à la plus ancienne. Aucune donnée personnelle n'y figure.", placeholder: "acteur, action, compagnie…" },
  preferences: { label: "Préférences", icon: Palette, description: "Apparence de l'interface et informations sur ta session.", placeholder: "" },
};

type Params = { q?: string | string[]; statut?: string | string[]; acteur?: string | string[]; jours?: string | string[]; type?: string | string[]; page?: string | string[] };

export async function SettingsHubPage({ tab, searchParams }: { tab: SettingsTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const { sub } = await requireSession();
  const now = new Date();
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const page = Math.max(1, Math.floor(Number(firstString(sp.page)) || 1));
  const searchable = tab === "equipe-admin" || tab === "journal-backoffice";
  const counts = settingsCounts(q, sub, now);
  const meta = META[tab];
  const status = tab === "equipe-admin" ? parseFilter(firstString(sp.statut), ADMIN_STATUSES) : undefined;
  const actors = journalRepo.actors();
  const actor = tab === "journal-backoffice" ? parseFilter(firstString(sp.acteur), actors) : undefined;
  const daysText = tab === "journal-backoffice" ? parseFilter(firstString(sp.jours), JOURNAL_WINDOWS.map(String)) : undefined;
  const reveals = tab === "journal-backoffice" && firstString(sp.type) === "revelations";

  const tabs: LinkTab[] = SETTINGS_TABS.map((t, i) => ({
    key: t, label: META[t].label, icon: META[t].icon, href: settingsTabPath(t),
    count: t === "equipe-admin" || t === "journal-backoffice" ? counts[t] : t === "securite" && counts.securite > 0 ? counts.securite : undefined,
    urgent: t === "securite", divider: i === 2 || i === 4,
  }));

  const active: Record<string, string | undefined> = { q: q || undefined, statut: status, acteur: actor, jours: daysText, type: reveals ? "revelations" : undefined };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[]) => {
    const keep: Record<string, string> = {};
    for (const [k, v] of Object.entries(active)) if (v && k !== param) keep[k] = v;
    return <FilterSelect label={label} param={param} basePath={settingsTabPath(tab)} current={current ?? "all"} options={options} keep={keep} />;
  };

  let stats: Stat[] = [];
  let toolbar: React.ReactNode = null;
  let body: React.ReactNode = null;
  let actions: React.ReactNode = undefined;
  let empty = false;

  if (tab === "profil") {
    const v = profileRepo.view(sub, now);
    const checks = myChecks(sub, now);
    if (!v || !checks) notFound();
    actions = <ProfileActions displayName={v.displayName} totpEnabled={v.totpEnabled} otherActiveSessions={v.otherActiveSessions} />;
    body = <ProfileView v={v} checks={checks} />;
  } else if (tab === "equipe-admin") {
    const all = team(undefined, undefined, sub, now);
    const list = team(q, status, sub, now);
    const p = posture(sub, now);
    stats = [
      { label: "Administrateurs", value: formatNumber(all.length), icon: UsersThree },
      { label: "Actifs", value: formatNumber(p.active), icon: ShieldCheck, hint: `${p.suspended} suspendu(s)` },
      { label: "Couverture 2FA", value: p.mfaCoverage === null ? "—" : `${p.mfaCoverage} %`, icon: Key },
      { label: "Sessions actives", value: formatNumber(p.activeSessions), icon: Eye },
    ];
    actions = <InviteAdminButton />;
    toolbar = select("Statut", "statut", status, [{ value: "all", label: "Tous" }, { value: "active", label: "Actifs" }, { value: "suspended", label: "Suspendus" }, { value: "invited", label: "Invités" }]);
    empty = list.length === 0;
    body = <TeamView admins={list} />;
  } else if (tab === "securite") {
    body = <SecurityView p={posture(sub, now)} />;
  } else if (tab === "journal-backoffice") {
    const st = journalRepo.stats(now);
    const all = journalGroups(journalRepo.list({ actor, days: daysText ? Number(daysText) : undefined, revealsOnly: reveals }, now), q).flatMap((g) => g.rows);
    const slice = all.slice((page - 1) * PAGE, page * PAGE);
    stats = [
      { label: "Entrées sur 7 jours", value: formatNumber(st.entries7d), icon: Clock },
      { label: "Acteurs sur 7 jours", value: formatNumber(st.actors7d), icon: Users },
      { label: "Révélations sur 30 jours", value: formatNumber(st.reveals30d), icon: Eye, hint: "données personnelles" },
      { label: "Entrées affichées", value: formatNumber(all.length), icon: ShieldWarning },
    ];
    toolbar = <>
      {select("Acteur", "acteur", actor, [{ value: "all", label: "Tous" }, ...actors.map((a) => ({ value: a, label: a }))])}
      {select("Période", "jours", daysText, [{ value: "all", label: "Toute la période" }, { value: "7", label: "7 jours" }, { value: "30", label: "30 jours" }, { value: "90", label: "90 jours" }])}
      {select("Type", "type", reveals ? "revelations" : undefined, [{ value: "all", label: "Toutes" }, { value: "revelations", label: "Révélations de données" }])}
    </>;
    empty = all.length === 0;
    body = <>
      <JournalView groups={journalGroups(slice, undefined)} />
      <LinkPager basePath={settingsTabPath(tab)} page={page} pageCount={Math.ceil(all.length / PAGE)} total={all.length} size={PAGE} params={{ q: q || undefined, acteur: actor, jours: daysText, type: reveals ? "revelations" : undefined }} />
    </>;
  } else {
    body = <PreferencesView identifier={sub} />;
  }

  const hiddenKeys = ["statut", "acteur", "jours", "type"] as const;
  return (
    <>
      <PageHeader title="Paramètres" description={meta.description} actions={actions} />
      {(searchable || toolbar) && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          {searchable && (
            <form action={settingsTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
              {hiddenKeys.map((k) => { const v = firstString(sp[k]); return v ? <input key={k} type="hidden" name={k} value={v} /> : null; })}
              <label>
                <span className="sr-only">Rechercher dans les paramètres</span>
                <MagnifyingGlass size={18} aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input name="q" defaultValue={q} autoComplete="off" placeholder={`Rechercher : ${meta.placeholder}`}
                  className="h-10 w-full rounded-xl border border-border bg-card pl-10 pr-4 text-sm shadow-card outline-none placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/30" />
              </label>
            </form>
          )}
          {toolbar}
        </div>
      )}
      <LinkTabs label="Sections" active={tab} tabs={tabs} />
      {q && searchable && <p className="mb-5 text-sm text-muted-foreground">Résultats pour « <span className="font-medium text-foreground">{q}</span> ». <Link href={settingsTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link></p>}
      {!q && stats.length > 0 && <StatStrip stats={stats} />}
      {empty ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 px-6 py-14 text-center">
          <p className="font-medium">{q ? `Aucun résultat dans « ${meta.label} »` : "Rien à afficher ici."}</p>
        </div>
      ) : body}
    </>
  );
}
