import { Buildings, CalendarBlank, Clock, Envelope, IdentificationBadge, Phone, ShieldCheck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { UserContactField } from "@/components/access/user-contact-field";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { formatDate, formatDateTime } from "@/lib/format";
import { permissionDomainLabel, sessionStateBadge, userStatusBadge } from "@/lib/labels";
import { maskEmail, maskPhone } from "@/lib/mask";
import { PERMISSION_DOMAINS, type UserDetail } from "@/lib/repos/access";

const TAB_VALUES = ["profil", "role", "sessions", "activite"];

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-semibold">{children}</div>
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";
const initials = (n: string) => n.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]!.toUpperCase()).join("");

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/**
 * Server Component: only rendered nodes reach TabsWithUrl. E-mail and phone are masked here; the
 * client field receives the masked string and fetches the real value through a journaled action.
 */
export function UserTabs({ detail, initialTab }: { detail: UserDetail; initialTab?: string }) {
  const { user, role } = detail;
  const status = userStatusBadge(user.status);

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Panel title="Vue d'ensemble">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 p-5">
            <span aria-hidden className="flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-orange-500 text-lg font-bold text-orange-500">{initials(user.displayName)}</span>
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{user.displayName}</p>
              <p className="font-mono text-sm text-muted-foreground">{user.username}</p>
            </div>
            <StatusBadge tone="info">{role?.name ?? user.roleCode}</StatusBadge>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={Envelope} label="E-mail"><UserContactField userId={user.id} field="email" masked={maskEmail(user.email)} /></Info>
            <Info icon={Phone} label="Téléphone"><UserContactField userId={user.id} field="phone" masked={maskPhone(user.phone)} /></Info>
            <Info icon={Buildings} label="Compagnie">
              {user.companyId && detail.companyName ? <Link href={`/compagnies/${user.companyId}?onglet=equipe`} className="hover:underline">{detail.companyName}</Link> : "—"}
            </Info>
            <Info icon={IdentificationBadge} label="Identifiant"><span className="font-mono">{user.username}</span></Info>
            <Info icon={CalendarBlank} label="Compte créé le">{formatDate(user.createdAt)}</Info>
            <Info icon={Clock} label="Dernière connexion">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Jamais"}</Info>
          </div>
        </Panel>
      ),
    },
    {
      value: "role", label: "Rôle et permissions",
      content: (
        <div className="space-y-5">
          <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <ShieldCheck size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{role?.name ?? user.roleCode}</p>
              {role && <p className="text-sm text-muted-foreground">{role.description}</p>}
            </div>
            <span className="font-mono text-xs text-muted-foreground">{user.roleCode}</span>
            <p className="text-right"><span className="text-3xl font-bold tabular-nums">{detail.permissions.length}</span><span className="block text-sm text-muted-foreground">permission{detail.permissions.length > 1 ? "s" : ""}</span></p>
          </section>
          {detail.permissions.length === 0 ? <Panel title="Permissions"><Empty>Ce rôle ne porte aucune permission.</Empty></Panel> : (
            <div className="grid gap-5 lg:grid-cols-2">
              {PERMISSION_DOMAINS.map((d) => {
                const perms = detail.permissions.filter((p) => p.domain === d);
                if (perms.length === 0) return null;
                return (
                  <Panel key={d} title={`${permissionDomainLabel(d)} (${perms.length})`}>
                    <ul className="space-y-2">
                      {perms.map((p) => (
                        <li key={p.code} className="rounded-xl border border-border p-3">
                          <p className="font-mono text-xs font-semibold">{p.code}</p>
                          <p className="mt-0.5 text-sm text-muted-foreground">{p.description}</p>
                        </li>
                      ))}
                    </ul>
                  </Panel>
                );
              })}
            </div>
          )}
        </div>
      ),
    },
    {
      value: "sessions", label: "Sessions",
      content: (
        <Panel title={`Sessions (${detail.sessions.length})`}>
          <p className="mb-4 text-sm font-medium" data-testid="active-session-count">{detail.activeSessions} session(s) active(s)</p>
          {detail.sessions.length === 0 ? <Empty>Aucune session.</Empty> : (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Appareil</th>
                  <th className={TH}>Adresse IP</th>
                  <th className={TH}>Début</th>
                  <th className={TH}>Dernière activité</th>
                  <th className={TH}>Expiration</th>
                  <th className={TH}>État</th>
                  <th className={TH}>Motif de révocation</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.sessions.map((x) => {
                  const b = sessionStateBadge(x.state);
                  return (
                    <tr key={x.id}>
                      <td>{x.deviceLabel}</td>
                      <td className="font-mono text-xs">{x.ip}</td>
                      <td>{formatDateTime(x.createdAt)}</td>
                      <td>{formatDateTime(x.lastSeenAt)}</td>
                      <td>{formatDateTime(x.expiresAt)}</td>
                      <td><StatusBadge tone={b.tone}>{b.label}</StatusBadge></td>
                      <td className="text-muted-foreground">{x.revokedReason ?? "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table></div>
          )}
        </Panel>
      ),
    },
    {
      value: "activite", label: "Activité",
      content: (
        <Panel title={`Activité (${detail.activity.length})`}>
          {detail.activity.length === 0 ? <Empty>Aucune activité enregistrée pour ce compte.</Empty> : (
            <ol className="relative ml-2 space-y-5 border-l border-border pl-6">
              {detail.activity.map((a) => (
                <li key={a.id} className="relative text-sm">
                  <span aria-hidden className="absolute -left-[31px] top-1.5 size-2.5 rounded-full bg-orange-500 ring-4 ring-card" />
                  <p className="font-medium">{a.action}</p>
                  <p className="text-xs text-muted-foreground">{a.actor} · {formatDateTime(a.at)}</p>
                </li>
              ))}
            </ol>
          )}
        </Panel>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
