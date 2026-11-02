import Link from "next/link";
import { UserContactField } from "@/components/access/user-contact-field";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { permissionDomainLabel, sessionStateBadge, userStatusBadge } from "@/lib/labels";
import { maskEmail, maskPhone } from "@/lib/mask";
import { PERMISSION_DOMAINS, type UserDetail } from "@/lib/repos/access";

const TAB_VALUES = ["profil", "role", "sessions", "activite"];

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
        <Card><CardContent><dl>
          <DetailRow label="Nom affiché">{user.displayName}</DetailRow>
          <DetailRow label="Identifiant">{user.username}</DetailRow>
          <DetailRow label="E-mail"><UserContactField userId={user.id} field="email" masked={maskEmail(user.email)} /></DetailRow>
          <DetailRow label="Téléphone"><UserContactField userId={user.id} field="phone" masked={maskPhone(user.phone)} /></DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Compagnie">
            {user.companyId && detail.companyName ? (
              <Link href={`/compagnies/${user.companyId}?onglet=equipe`} className="hover:underline">{detail.companyName}</Link>
            ) : "—"}
          </DetailRow>
          <DetailRow label="Compte créé le">{formatDate(user.createdAt)}</DetailRow>
          <DetailRow label="Dernière connexion">{user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "Jamais"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "role", label: "Rôle et permissions",
      content: (
        <Card><CardContent className="space-y-4">
          <div>
            <p className="font-medium">{role?.name ?? user.roleCode} <span className="font-mono text-xs text-muted-foreground">{user.roleCode}</span></p>
            {role && <p className="text-sm text-muted-foreground">{role.description}</p>}
          </div>
          {detail.permissions.length === 0 ? <Empty>Ce rôle ne porte aucune permission.</Empty> : (
            <div className="space-y-3">
              {PERMISSION_DOMAINS.map((d) => {
                const perms = detail.permissions.filter((p) => p.domain === d);
                if (perms.length === 0) return null;
                return (
                  <div key={d}>
                    <h3 className="text-xs font-semibold uppercase text-muted-foreground">{permissionDomainLabel(d)}</h3>
                    <ul className="mt-1 space-y-1 text-sm">
                      {perms.map((p) => (
                        <li key={p.code}><span className="font-mono text-xs">{p.code}</span> · {p.description}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "sessions", label: "Sessions",
      content: (
        <Card><CardContent className="space-y-3">
          <p className="text-sm" data-testid="active-session-count">{detail.activeSessions} session(s) active(s)</p>
          {detail.sessions.length === 0 ? <Empty>Aucune session.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Appareil</th>
                  <th className="py-1 font-medium">Adresse IP</th>
                  <th className="py-1 font-medium">Début</th>
                  <th className="py-1 font-medium">Dernière activité</th>
                  <th className="py-1 font-medium">Expiration</th>
                  <th className="py-1 font-medium">État</th>
                  <th className="py-1 font-medium">Motif de révocation</th>
                </tr>
              </thead>
              <tbody>
                {detail.sessions.map((x) => {
                  const b = sessionStateBadge(x.state);
                  return (
                    <tr key={x.id} className="border-t border-border">
                      <td className="py-1.5">{x.deviceLabel}</td>
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
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "activite", label: "Activité",
      content: (
        <Card><CardContent>
          {detail.activity.length === 0 ? <Empty>Aucune activité enregistrée pour ce compte.</Empty> : (
            <ul className="space-y-2 text-sm">
              {detail.activity.map((a) => (
                <li key={a.id}><p>{a.action}</p><p className="text-xs text-muted-foreground">{a.actor} · {formatDateTime(a.at)}</p></li>
              ))}
            </ul>
          )}
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
