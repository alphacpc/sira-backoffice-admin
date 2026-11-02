import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { ProfileActions } from "@/components/settings/profile-actions";
import { RevokeMySessionButton } from "@/components/settings/revoke-my-session-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireSession } from "@/lib/auth/session";
import { formatDate, formatDateTime } from "@/lib/format";
import { profileRepo, type SessionState } from "@/lib/repos/backoffice";

export const dynamic = "force-dynamic";

const STATE: Record<SessionState, { label: string; tone: "success" | "danger" | "neutral" }> = {
  active: { label: "Active", tone: "success" },
  revoked: { label: "Révoquée", tone: "danger" },
  expired: { label: "Expirée", tone: "neutral" },
};

export default async function ProfilePage() {
  const { sub } = await requireSession();
  const view = profileRepo.view(sub, new Date());
  if (!view) notFound();
  return (
    <>
      <PageHeader
        title="Mon profil"
        description="Sécurité de ton compte administrateur : TOTP et sessions."
        actions={<ProfileActions displayName={view.displayName} totpEnabled={view.totpEnabled} otherActiveSessions={view.otherActiveSessions} />}
      />
      <Card className="mb-6">
        <CardHeader><CardTitle>Compte</CardTitle></CardHeader>
        <CardContent><dl>
          <DetailRow label="Nom affiché"><span data-testid="profile-name">{view.displayName}</span></DetailRow>
          <DetailRow label="Identifiant"><span data-testid="profile-identifier">{view.identifier}</span></DetailRow>
          <DetailRow label="Rôle">{view.roleLabel}</DetailRow>
          <DetailRow label="TOTP">
            <span data-testid="profile-totp">
              {view.totpEnabled ? `Activé depuis le ${formatDate(view.totpEnrolledAt!)}` : "Non enrôlé"}
            </span>
          </DetailRow>
          <DetailRow label="Codes de récupération restants"><span data-testid="profile-codes">{view.recoveryCodesRemaining}</span></DetailRow>
          <DetailRow label="Dernière connexion">{view.lastLoginAt ? formatDateTime(view.lastLoginAt) : "—"}</DetailRow>
          <DetailRow label="Compte créé le">{formatDate(view.createdAt)}</DetailRow>
        </dl></CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Mes sessions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-border bg-muted/50 text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Appareil</th>
                <th className="px-3 py-2 font-medium">Adresse</th>
                <th className="px-3 py-2 font-medium">Début</th>
                <th className="px-3 py-2 font-medium">Dernière activité</th>
                <th className="px-3 py-2 font-medium">État</th>
                <th className="px-3 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {view.sessions.map((s) => {
                const state = STATE[s.state];
                return (
                  <tr key={s.id} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">
                      {s.deviceLabel}{s.current && <span className="ml-2 text-xs text-accent-text">Session courante</span>}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{s.ip}</td>
                    <td className="px-3 py-2">{formatDateTime(s.createdAt)}</td>
                    <td className="px-3 py-2">{formatDateTime(s.lastSeenAt)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge tone={state.tone}>{state.label}</StatusBadge>
                      {s.revokedReason && <span className="ml-2 text-xs text-muted-foreground">{s.revokedReason}</span>}
                    </td>
                    <td className="px-3 py-2">
                      {s.state === "active" && !s.current
                        ? <RevokeMySessionButton sessionId={s.id} label={s.deviceLabel} />
                        : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
      <p className="mt-3 text-xs text-muted-foreground">
        Les sessions durent 8 heures. Pour fermer la session courante, utilise la déconnexion.
      </p>
    </>
  );
}
