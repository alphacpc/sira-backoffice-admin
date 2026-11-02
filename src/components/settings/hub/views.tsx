import { ArrowRight, CheckCircle, Clock, DeviceMobile, Eye, Key, Laptop, Lock, ShieldCheck, ShieldWarning, Siren, UserPlus, Prohibit, WarningCircle, XCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Pill, type Tone } from "@/components/compliance/hub/pills";
import { Gauge, Panel } from "@/components/monitoring/hub/primitives";
import { AdminActions } from "@/components/settings/admin-actions";
import { RevokeMySessionButton } from "@/components/settings/revoke-my-session-button";
import { formatDate, formatDateTime, formatNumber } from "@/lib/format";
import { adminStatusBadge } from "@/lib/labels";
import type { JournalRow, ProfileView, SessionState } from "@/lib/repos/backoffice";
import { IDLE_DAYS, journalKind, type AdminCard, type JournalKind, type MyChecks, type SecurityPosture } from "@/lib/repos/settings-hub";
import { cn } from "@/lib/utils";
import { ThemePicker } from "./theme-picker";

const ago = (iso: string, now = Date.now()) => {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  return m < 1 ? "à l'instant" : m < 60 ? `il y a ${m} min` : m < 2880 ? `il y a ${Math.round(m / 60)} h` : `il y a ${Math.round(m / 1440)} j`;
};
const TONE_OF: Record<string, Tone> = { success: "lime", danger: "rose", info: "sky", neutral: "zinc", warning: "amber" };

export function Avatar({ name, size = "md" }: { name: string; size?: "md" | "lg" | "xl" }) {
  const initials = name.split(/[\s.@]+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join("");
  return <span aria-hidden className={cn("flex shrink-0 items-center justify-center rounded-full bg-[#ea580c] font-bold text-white", size === "xl" ? "size-20 text-2xl" : size === "lg" ? "size-12 text-base" : "size-10 text-sm")}>{initials}</span>;
}

/* ───────────── Profil ───────────── */
const SESSION_STATE: Record<SessionState, [string, Tone]> = { active: ["Active", "lime"], revoked: ["Révoquée", "rose"], expired: ["Expirée", "zinc"] };
const isMobile = (label: string) => /iphone|android|mobile|ipad/i.test(label);

export function ProfileView({ v, checks }: { v: ProfileView; checks: MyChecks }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow-card dark:bg-card xl:col-span-2" aria-label="Compte">
          <div className="flex flex-wrap items-center gap-5">
            <Avatar name={v.displayName} size="xl" />
            <div className="min-w-0">
              <h2 className="text-2xl font-extrabold tracking-tight" data-testid="profile-name">{v.displayName}</h2>
              <p className="mt-0.5 font-mono text-sm text-muted-foreground" data-testid="profile-identifier">{v.identifier}</p>
              <div className="mt-3 flex flex-wrap gap-2"><Pill tone="violet">{v.roleLabel}</Pill><Pill tone={v.totpEnabled ? "lime" : "rose"}>{v.totpEnabled ? "2FA activée" : "2FA non enrôlée"}</Pill></div>
            </div>
          </div>
          <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-4">
            <div><dt className="text-xs text-muted-foreground">Compte créé le</dt><dd className="mt-1 font-semibold">{formatDate(v.createdAt)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Dernière connexion</dt><dd className="mt-1 font-semibold">{v.lastLoginAt ? ago(v.lastLoginAt) : "—"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">TOTP</dt><dd className="mt-1 font-semibold" data-testid="profile-totp">{v.totpEnabled ? `depuis le ${formatDate(v.totpEnrolledAt!)}` : "Non enrôlé"}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Codes de récupération</dt><dd className="mt-1 font-semibold tabular-nums" data-testid="profile-codes">{v.recoveryCodesRemaining}</dd></div>
          </dl>
        </section>
        <Panel title="Sécurité du compte" subtitle="Quatre contrôles essentiels">
          <Gauge value={checks.score} label={`${checks.score} %`} tone={checks.score >= 75 ? "ok" : checks.score >= 50 ? "warn" : "bad"} />
          <ul className="mt-4 space-y-2 border-t border-border pt-4">
            {checks.items.map((i) => (
              <li key={i.label} className="flex items-start gap-2.5 text-sm">
                {i.ok ? <CheckCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-lime-600" /> : <WarningCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-amber-500" />}
                <div><p className="font-medium leading-tight">{i.label}</p><p className="text-xs text-muted-foreground">{i.hint}</p></div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <Panel title="Mes sessions" subtitle="Les sessions durent 8 heures. Pour fermer la session courante, utilise la déconnexion.">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {v.sessions.map((s) => {
            const [label, tone] = SESSION_STATE[s.state];
            const Icon = isMobile(s.deviceLabel) ? DeviceMobile : Laptop;
            return (
              <li key={s.id} className={cn("rounded-2xl border p-4", s.current ? "border-accent/50 bg-accent-soft/30" : "border-border")}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-muted"><Icon size={24} weight="duotone" aria-hidden /></span>
                    <div className="min-w-0"><p className="truncate font-semibold">{s.deviceLabel}</p><p className="font-mono text-xs text-muted-foreground">{s.ip}</p></div>
                  </div>
                  <Pill tone={tone}>{label}</Pill>
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                  <div><dt className="text-muted-foreground">Début</dt><dd className="font-medium">{formatDateTime(s.createdAt)}</dd></div>
                  <div><dt className="text-muted-foreground">Dernière activité</dt><dd className="font-medium">{ago(s.lastSeenAt)}</dd></div>
                </dl>
                <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3 text-xs">
                  {s.current ? <span className="font-semibold text-accent-text">Session courante</span> : s.revokedReason ? <span className="text-muted-foreground">{s.revokedReason}</span> : <span className="text-muted-foreground">Expire {formatDateTime(s.expiresAt)}</span>}
                  {s.state === "active" && !s.current && <RevokeMySessionButton sessionId={s.id} label={s.deviceLabel} />}
                </div>
              </li>
            );
          })}
        </ul>
      </Panel>
    </div>
  );
}

/* ───────────── Équipe ───────────── */
export function TeamView({ admins }: { admins: AdminCard[] }) {
  const now = Date.now();
  return (
    <ul className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
      {admins.map((a) => {
        const b = adminStatusBadge(a.status);
        return (
          <li key={a.id} className={cn("flex flex-col rounded-2xl bg-white p-5 shadow-card dark:bg-card", a.isSelf && "ring-2 ring-accent/40")}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar name={a.displayName} size="lg" />
                <div className="min-w-0"><p className="truncate font-semibold">{a.displayName}{a.isSelf && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-[10px] font-bold text-accent-text">Toi</span>}</p><p className="truncate font-mono text-xs text-muted-foreground">{a.identifier}</p></div>
              </div>
              <Pill tone={TONE_OF[b.tone] ?? "zinc"}>{b.label}</Pill>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <span className={cn("inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium", a.totpEnabled ? "bg-lime-100 text-lime-800 dark:bg-lime-400/15 dark:text-lime-300" : "bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-300")}>
                {a.totpEnabled ? <ShieldCheck size={14} weight="fill" aria-hidden /> : <ShieldWarning size={14} weight="fill" aria-hidden />}{a.totpEnabled ? `2FA · ${a.recoveryCodesRemaining} codes` : "2FA absente"}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1 text-xs font-medium"><Laptop size={14} weight="duotone" aria-hidden /><span data-testid="admin-sessions" className="tabular-nums">{a.activeSessions}</span> session(s)</span>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
              <div><dt className="text-muted-foreground">Dernière connexion</dt><dd className={cn("font-medium", a.idle && a.status === "active" && "text-amber-600")}>{a.lastLoginAt ? ago(a.lastLoginAt, now) : "Jamais"}</dd></div>
              <div><dt className="text-muted-foreground">Membre depuis</dt><dd className="font-medium">{formatDate(a.createdAt)}</dd></div>
            </dl>
            {a.risks.length > 0 && <ul className="mt-3 space-y-1">{a.risks.map((r) => <li key={r} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"><WarningCircle size={14} weight="fill" aria-hidden />{r}</li>)}</ul>}
            <div className="mt-auto border-t border-border pt-4 mt-4">
              <AdminActions adminId={a.id} identifier={a.identifier} status={a.status} totpEnabled={a.totpEnabled} activeSessions={a.activeSessions} isSelf={a.isSelf} />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

/* ───────────── Sécurité ───────────── */
const POLICIES = [
  { icon: Key, title: "TOTP obligatoire", text: "Chaque administrateur doit enrôler un second facteur ; huit codes de récupération à usage unique." },
  { icon: Clock, title: "Sessions de 8 heures", text: "Une session expire seule au bout de 8 heures et peut être révoquée à tout moment par son titulaire ou un autre administrateur." },
  { icon: Eye, title: "Contacts masqués", text: "E-mails et téléphones restent masqués ; chaque révélation est journalisée avec l'acteur et l'heure." },
  { icon: Lock, title: "Motif obligatoire", text: "Suspendre, réactiver, réinitialiser un TOTP ou révoquer des sessions exige un motif, conservé dans le journal." },
  { icon: Prohibit, title: "Garde-fous", text: "Impossible de suspendre son propre compte, de réinitialiser son propre TOTP ou de suspendre le dernier administrateur actif." },
  { icon: ShieldCheck, title: "Journal en lecture seule", text: "Aucune entrée du journal ne peut être modifiée ni supprimée, et aucune donnée personnelle n'y figure." },
] as const;

export function SecurityView({ p }: { p: SecurityPosture }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-5 xl:grid-cols-3">
        <Panel title="Score de sécurité de l'équipe" subtitle="2FA, codes de récupération, comptes inactifs, invitations en attente">
          <Gauge value={p.score} label={`${p.score} %`} tone={p.score >= 80 ? "ok" : p.score >= 60 ? "warn" : "bad"} caption={p.score >= 80 ? "Posture solide" : p.score >= 60 ? "À renforcer" : "Action requise"} />
        </Panel>
        <Panel className="xl:col-span-2" title="Couverture" subtitle="Répartition des comptes">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              ["Couverture 2FA", p.mfaCoverage === null ? "—" : `${p.mfaCoverage} %`, "des comptes actifs"],
              ["Sessions actives", formatNumber(p.activeSessions), "sur toute l'équipe"],
              [`Inactifs ${IDLE_DAYS} j+`, formatNumber(p.idle), "comptes actifs sans connexion"],
              ["Actifs", formatNumber(p.active), `sur ${p.total} comptes`],
              ["Invités", formatNumber(p.invited), "invitation non activée"],
              ["Suspendus", formatNumber(p.suspended), "accès coupé"],
            ].map(([k, v, h]) => <div key={k} className="rounded-2xl bg-muted/60 p-4"><p className="text-xs text-muted-foreground">{k}</p><p className="mt-1 text-3xl font-extrabold tabular-nums">{v}</p><p className="mt-0.5 text-xs text-muted-foreground">{h}</p></div>)}
          </div>
        </Panel>
      </div>
      <Panel title="Comptes à surveiller" subtitle="Administrateurs qui fragilisent la sécurité de l'équipe" right={<Link href="/parametres/equipe-admin" className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">Gérer l&apos;équipe <ArrowRight size={12} aria-hidden /></Link>}>
        {p.atRisk.length === 0 ? <p className="flex items-center gap-2 text-sm text-lime-700"><CheckCircle size={18} weight="duotone" aria-hidden />Aucun compte à risque.</p> : (
          <ul className="grid gap-3 md:grid-cols-2">
            {p.atRisk.map((a) => (
              <li key={a.id} className="flex items-start gap-3 rounded-xl border border-border p-3">
                <Avatar name={a.displayName} />
                <div className="min-w-0"><p className="truncate font-semibold">{a.displayName}</p><ul className="mt-1 space-y-0.5">{a.risks.map((r) => <li key={r} className="flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300"><WarningCircle size={13} weight="fill" aria-hidden />{r}</li>)}</ul></div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
      <Panel title="Politiques appliquées" subtitle="Règles que le backoffice impose à tous les administrateurs">
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {POLICIES.map((x) => (
            <li key={x.title} className="flex gap-3 rounded-2xl bg-muted/50 p-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-100 text-orange-600 dark:bg-orange-400/15 dark:text-orange-300"><x.icon size={22} weight="duotone" aria-hidden /></span>
              <div><p className="font-semibold">{x.title}</p><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{x.text}</p></div>
            </li>
          ))}
        </ul>
      </Panel>
    </div>
  );
}

/* ───────────── Journal ───────────── */
const KIND: Record<JournalKind, { icon: typeof Eye; cls: string }> = {
  reveal: { icon: Eye, cls: "bg-amber-100 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300" },
  suspend: { icon: Prohibit, cls: "bg-rose-100 text-rose-700 dark:bg-rose-400/15 dark:text-rose-300" },
  invite: { icon: UserPlus, cls: "bg-lime-100 text-lime-700 dark:bg-lime-400/15 dark:text-lime-300" },
  security: { icon: Key, cls: "bg-violet-100 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300" },
  session: { icon: XCircle, cls: "bg-sky-100 text-sky-700 dark:bg-sky-400/15 dark:text-sky-300" },
  other: { icon: Siren, cls: "bg-zinc-200 text-zinc-700 dark:bg-zinc-300/15 dark:text-zinc-200" },
};
const dayLabel = (iso: string) => new Date(iso).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });

export function JournalView({ groups }: { groups: { day: string; rows: JournalRow[] }[] }) {
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.day} aria-label={dayLabel(g.day)}>
          <h3 className="mb-3 flex items-center gap-3 text-sm font-semibold"><span className="capitalize">{dayLabel(g.day)}</span><span className="h-px flex-1 bg-border" /><span className="text-xs font-normal text-muted-foreground">{g.rows.length} {g.rows.length > 1 ? "actions" : "action"}</span></h3>
          <ul className="space-y-2">
            {g.rows.map((r) => {
              const k = KIND[journalKind(r.action)];
              return (
                <li key={r.id} className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-card dark:bg-card">
                  <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", k.cls)}><k.icon size={22} weight="duotone" aria-hidden /></span>
                  <div className="min-w-0 flex-1"><p className="text-sm font-medium">{r.action}</p><p className="mt-0.5 text-xs text-muted-foreground">{r.actor}{r.companyName ? ` · ${r.companyName}` : ""}</p></div>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">{formatDateTime(r.at).slice(-5)}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/* ───────────── Préférences ───────────── */
export function PreferencesView({ identifier }: { identifier: string }) {
  return (
    <div className="space-y-5">
      <Panel title="Apparence" subtitle="Le thème est mémorisé sur cet appareil"><ThemePicker /></Panel>
      <div className="grid gap-5 xl:grid-cols-2">
        <Panel title="Session" subtitle="Informations sur ta connexion actuelle">
          <dl className="space-y-3 text-sm">
            {[["Connecté en tant que", identifier], ["Durée de session", "8 heures"], ["Authentification", "Mot de passe + TOTP"], ["Environnement", "Démonstration (données fictives)"]].map(([k, v]) => <div key={k} className="flex justify-between gap-4 border-b border-border pb-3 last:border-0 last:pb-0"><dt className="text-muted-foreground">{k}</dt><dd className="font-medium">{v}</dd></div>)}
          </dl>
        </Panel>
        <Panel title="Confidentialité" subtitle="Comment le backoffice protège les données">
          <ul className="space-y-3 text-sm">
            {["Les e-mails et téléphones sont masqués par défaut ; chaque révélation est enregistrée.", "Les adresses IP sont tronquées à l'affichage.", "Le journal d'activité ne contient aucune donnée personnelle.", "Chaque action sensible demande un motif conservé dans le journal."].map((t) => <li key={t} className="flex gap-2.5"><CheckCircle size={18} weight="fill" aria-hidden className="mt-0.5 shrink-0 text-lime-600" />{t}</li>)}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
