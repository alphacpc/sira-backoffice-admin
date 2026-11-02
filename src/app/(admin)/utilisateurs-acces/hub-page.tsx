import {
  CheckCircle, Crown, DeviceMobile, Key, Prohibit, ShieldCheck, UsersThree, MagnifyingGlass, Monitor, Clock,
} from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { PermissionsMatrix } from "@/components/access/hub/permissions-matrix";
import { RolesGrid } from "@/components/access/hub/roles-grid";
import { SessionsTable } from "@/components/access/hub/sessions-table";
import { UsersTable } from "@/components/access/hub/users-table";
import { StatStrip, type Stat } from "@/components/billing/hub/stat-strip";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { LinkTabs, type LinkTab } from "@/components/ui/link-tabs";
import { formatDateTime, formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { permissionDomainLabel } from "@/lib/labels";
import { PERMISSION_DOMAINS, rolesRepo, permissionsRepo } from "@/lib/repos/access";
import { ACCESS_TABS, accessRepo, type AccessTab } from "@/lib/repos/access-hub";
import { firstString } from "@/lib/search-params";
import type { UserStatus } from "@/lib/types";

const BASE = "/utilisateurs-acces";
/** Path of a tab: the first one lives at the root of the section. */
export const accessTabPath = (t: AccessTab) => (t === "utilisateurs" ? BASE : `${BASE}/${t}`);

const META: Record<AccessTab, { label: string; icon: LinkTab["icon"]; description: string; placeholder: string }> = {
  utilisateurs: { label: "Utilisateurs", icon: UsersThree, description: "Tous les comptes de la plateforme : équipes des compagnies, clients et administrateurs.", placeholder: "nom, identifiant, rôle, compagnie…" },
  roles: { label: "Rôles", icon: Crown, description: "Les rôles de la plateforme et les permissions qu'ils portent (lecture seule).", placeholder: "rôle, permission…" },
  permissions: { label: "Permissions", icon: Key, description: "Matrice des permissions par rôle, regroupées par domaine (lecture seule).", placeholder: "code ou description de permission…" },
  sessions: { label: "Sessions", icon: Monitor, description: "Sessions actives de toute la plateforme. Les adresses IP sont tronquées au réseau (a.b.c.0).", placeholder: "utilisateur, appareil, adresse IP…" },
};

type Params = { q?: string | string[]; role?: string | string[]; statut?: string | string[]; domaine?: string | string[] };

export async function AccessHubPage({ tab, searchParams }: { tab: AccessTab; searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const q = (firstString(sp.q) ?? "").trim().slice(0, 80);
  const counts = accessRepo.counts(q);
  const meta = META[tab];
  const roles = rolesRepo.options();
  const role = parseFilter(firstString(sp.role), roles.map((r) => r.code));
  const statut = parseFilter(firstString(sp.statut), ["active", "suspended"] as const satisfies readonly UserStatus[]);
  const domain = parseFilter(firstString(sp.domaine), PERMISSION_DOMAINS);

  const tabHref = (t: AccessTab) => (q ? `${accessTabPath(t)}?${new URLSearchParams({ q }).toString()}` : accessTabPath(t));
  const tabs: LinkTab[] = ACCESS_TABS.map((t) => ({ key: t, label: META[t].label, icon: META[t].icon, href: tabHref(t), count: counts[t] }));
  const keep: Record<string, string> = { ...(q ? { q } : {}) };
  const select = (label: string, param: string, current: string | undefined, options: { value: string; label: string }[], also: Record<string, string> = {}) => (
    <FilterSelect label={label} param={param} basePath={accessTabPath(tab)} current={current ?? "all"} options={options} keep={{ ...keep, ...also }} />
  );
  const roleOptions = [{ value: "all", label: "Tous" }, ...roles.map((r) => ({ value: r.code, label: r.name }))];

  let stats: Stat[] = [];
  let toolbarFilter: React.ReactNode = null;
  let body: React.ReactNode = null;
  let empty = false;

  if (tab === "utilisateurs") {
    const all = accessRepo.users();
    const list = accessRepo.users(q, { role, status: statut });
    stats = [
      { label: "Comptes", value: formatNumber(all.length), icon: UsersThree },
      { label: "Comptes actifs", value: formatNumber(all.filter((u) => u.status === "active").length), icon: CheckCircle },
      { label: "Suspendus", value: formatNumber(all.filter((u) => u.status === "suspended").length), icon: Prohibit },
      { label: "Sessions actives", value: formatNumber(all.reduce((n, u) => n + u.activeSessions, 0)), icon: Monitor },
    ];
    toolbarFilter = (
      <>
        {select("Rôle", "role", role, roleOptions, statut ? { statut } : {})}
        {select("Statut", "statut", statut, [{ value: "all", label: "Tous" }, { value: "active", label: "Actifs" }, { value: "suspended", label: "Suspendus" }], role ? { role } : {})}
      </>
    );
    empty = list.length === 0;
    body = <UsersTable users={list} />;
  } else if (tab === "roles") {
    const list = accessRepo.roles(q);
    empty = list.length === 0;
    body = <RolesGrid roles={list} totalPermissions={permissionsRepo.list().length} />;
  } else if (tab === "permissions") {
    const matrix = accessRepo.permissions(q, domain);
    toolbarFilter = select("Domaine", "domaine", domain, [{ value: "all", label: "Tous" }, ...PERMISSION_DOMAINS.map((d) => ({ value: d, label: permissionDomainLabel(d) }))]);
    empty = matrix.groups.length === 0;
    body = <PermissionsMatrix matrix={matrix} />;
  } else {
    const all = accessRepo.sessions();
    const list = accessRepo.sessions(q, { role });
    const latest = all[0];
    stats = [
      { label: "Sessions actives", value: formatNumber(all.length), icon: Monitor },
      { label: "Utilisateurs connectés", value: formatNumber(new Set(all.map((s) => s.userId)).size), icon: UsersThree },
      { label: "Sur mobile", value: formatNumber(all.filter((s) => /iphone|android/i.test(s.deviceLabel)).length), icon: DeviceMobile },
      { label: "Dernière activité", value: latest ? formatDateTime(latest.lastSeenAt).split(" ").at(-1) ?? "—" : "—", icon: Clock, hint: latest?.displayName },
    ];
    toolbarFilter = select("Rôle", "role", role, roleOptions);
    empty = list.length === 0;
    body = <SessionsTable sessions={list} />;
  }

  const elsewhere = q ? ACCESS_TABS.filter((t) => t !== tab && counts[t] > 0) : [];

  return (
    <>
      <PageHeader title="Utilisateurs et accès" description={meta.description} />
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <form action={accessTabPath(tab)} method="get" role="search" className="relative min-w-72 flex-1 sm:max-w-md">
          {(["role", "statut", "domaine"] as const).map((k) => {
            const v = firstString(sp[k]);
            return v ? <input key={k} type="hidden" name={k} value={v} /> : null;
          })}
          <label>
            <span className="sr-only">Rechercher dans les utilisateurs et accès</span>
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
          <span className="font-medium tabular-nums text-foreground">{formatNumber(ACCESS_TABS.reduce((n, t) => n + counts[t], 0))}</span> dans toute la rubrique.{" "}
          <Link href={accessTabPath(tab)} className="font-medium text-accent-text hover:underline">Effacer</Link>
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
