import { Crown, ShieldCheck, Ticket, User, UsersFour } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { permissionDomainLabel } from "@/lib/labels";
import { PERMISSION_DOMAINS, type RoleRow } from "@/lib/repos/access";
import { RolePermissionsDialog } from "./role-permissions-dialog";

const ICON = { ADMIN: Crown, MANAGER: UsersFour, GUICHETIER: Ticket, CHAUFFEUR: ShieldCheck, USER: User } as const;
const TONE = {
  ADMIN: "bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300",
  MANAGER: "bg-sky-100 text-sky-600 dark:bg-sky-400/15 dark:text-sky-300",
  GUICHETIER: "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300",
  CHAUFFEUR: "bg-violet-100 text-violet-600 dark:bg-violet-400/15 dark:text-violet-300",
  USER: "bg-slate-100 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
} as const;

export function RolesGrid({ roles, totalPermissions }: { roles: RoleRow[]; totalPermissions: number }) {
  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {roles.map((r) => {
        const Icon = ICON[r.code as keyof typeof ICON] ?? User;
        const tone = TONE[r.code as keyof typeof TONE] ?? TONE.USER;
        const share = totalPermissions ? Math.round((r.permissions.length / totalPermissions) * 100) : 0;
        const groups = PERMISSION_DOMAINS
          .map((d) => ({ domain: permissionDomainLabel(d), items: r.permissions.filter((p) => p.domain === d).map((p) => ({ code: p.code, description: p.description })) }))
          .filter((g) => g.items.length > 0);
        return (
          <li key={r.code} className="flex flex-col rounded-2xl bg-white p-6 shadow-card dark:bg-card">
            <div className="flex items-start gap-4">
              <span className={`flex size-14 shrink-0 items-center justify-center rounded-2xl ${tone}`}><Icon size={30} weight="duotone" aria-hidden /></span>
              <div className="min-w-0">
                <h3 className="text-xl font-bold">{r.name}</h3>
                <p className="font-mono text-xs text-muted-foreground">{r.code}</p>
              </div>
            </div>
            <p className="mt-4 min-h-[2.75rem] text-sm text-muted-foreground">{r.description}</p>

            <dl className="mt-5 grid grid-cols-2 gap-2 rounded-2xl bg-muted/70 p-4 text-center">
              <div>
                <dd className="text-2xl font-bold tabular-nums" data-testid={`role-users-${r.code}`}>{r.userCount}</dd>
                <dt className="text-xs text-muted-foreground">utilisateur(s)</dt>
              </div>
              <div>
                <dd className="text-2xl font-bold tabular-nums" data-testid={`role-permissions-${r.code}`}>{r.permissions.length}</dd>
                <dt className="text-xs text-muted-foreground">permission(s)</dt>
              </div>
            </dl>

            <div className="mt-5">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Couverture des permissions</span><span className="font-semibold tabular-nums text-foreground">{share} %</span>
              </div>
              <div className="mt-1.5 h-2 rounded-full bg-muted"><div className="h-full rounded-full bg-accent" style={{ width: `${share}%` }} /></div>
            </div>

            <div className="mt-4 flex min-h-[2.25rem] flex-wrap gap-1.5">
              {groups.slice(0, 5).map((g) => <span key={g.domain} className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium">{g.domain} · {g.items.length}</span>)}
              {groups.length > 5 && <span className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground">+{groups.length - 5}</span>}
              {groups.length === 0 && <span className="text-xs text-muted-foreground">Aucune permission</span>}
            </div>

            <div className="mt-auto flex flex-wrap items-center gap-2 border-t border-border pt-5">
              <RolePermissionsDialog name={r.name} groups={groups} total={r.permissions.length} />
              <Link href={`/utilisateurs-acces?role=${r.code}`} className="inline-flex h-9 items-center rounded-lg bg-accent px-3 text-sm font-semibold text-accent-foreground hover:opacity-90">
                Voir les utilisateurs
              </Link>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
