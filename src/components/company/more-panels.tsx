import { ArrowRight, Bus, Clock, Gift, ShieldCheck, Users } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import { busStatusBadge, tripStatusBadge } from "@/lib/labels";
import { maskEmail } from "@/lib/mask";
import type { CompanyDetail } from "@/lib/types";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Section({ icon: Icon, title, action, children }: { icon: IconType; title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <div className="mb-4 flex items-center gap-3">
        <Icon size={26} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
        <h3 className="flex-1 text-sm font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}
const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;
const th = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const rows = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";

export function ReferralPanel({ detail }: { detail: CompanyDetail }) {
  const { code, credits } = detail.referral;
  const available = credits.filter((c) => c.status === "AVAILABLE");
  const cur = credits[0]?.currency ?? "XOF";
  const sum = (l: typeof credits) => l.reduce((a, c) => a + c.amount, 0);
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <Gift size={28} weight="duotone" aria-hidden className="text-orange-500" />
          <p className="mt-3 font-mono text-xl font-bold">{code ?? "Aucun"}</p>
          <p className="text-sm text-muted-foreground">Code de parrainage</p>
        </div>
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <p className="text-3xl font-bold tabular-nums">{formatMoney(sum(available), cur)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Crédits disponibles ({available.length})</p>
        </div>
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <p className="text-3xl font-bold tabular-nums">{formatMoney(sum(credits) - sum(available), cur)}</p>
          <p className="mt-1 text-sm text-muted-foreground">Crédits utilisés ({credits.length - available.length})</p>
        </div>
      </div>
      <Section icon={Gift} title={`Crédits reçus (${credits.length})`}>
        {credits.length === 0 ? <Empty>Aucun crédit reçu.</Empty> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className={th}>Montant</th><th className={`${th} text-right`}>Statut</th></tr></thead>
            <tbody className={rows}>
              {credits.map((cr) => (
                <tr key={cr.id}>
                  <td className="font-medium tabular-nums">{formatMoney(cr.amount, cr.currency)}</td>
                  <td className="text-right"><StatusBadge tone={cr.status === "AVAILABLE" ? "info" : "neutral"}>{cr.status === "AVAILABLE" ? "Disponible" : "Utilisé"}</StatusBadge></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

export function RetentionPanel({ days }: { days: number | null | undefined }) {
  return (
    <Section icon={ShieldCheck} title="Rétention des données">
      <p className="text-4xl font-bold tabular-nums">{days ?? 730}<span className="text-base font-medium text-muted-foreground"> jours</span></p>
      <p className="mt-1 text-sm text-muted-foreground">{days ? "Durée définie pour cette compagnie." : "Défaut plateforme : aucune durée propre n'est définie."}</p>
      <p className="mt-3 text-xs text-muted-foreground">Au-delà, les adresses IP et agents des traces d&apos;audit sont anonymisés. Les identifiants d&apos;utilisateur restent.</p>
    </Section>
  );
}

const ROLE: Record<string, string> = { MANAGER: "Responsable", GUICHETIER: "Agent de vente", CHAUFFEUR: "Chauffeur" };

export function TeamPanel({ detail }: { detail: CompanyDetail }) {
  const emps = detail.employees;
  const roles = Object.entries(ROLE).map(([k, label]) => ({ label, n: emps.filter((e) => e.role === k).length }));
  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-4">
        <div className="rounded-card border border-border bg-card p-5 shadow-card">
          <Users size={28} weight="duotone" aria-hidden className="text-orange-500" />
          <p className="mt-3 text-3xl font-bold tabular-nums">{emps.length}</p>
          <p className="text-sm text-muted-foreground">Employés</p>
        </div>
        {roles.map((r) => (
          <div key={r.label} className="rounded-card border border-border bg-card p-5 shadow-card">
            <p className="text-3xl font-bold tabular-nums">{r.n}</p>
            <p className="mt-1 text-sm text-muted-foreground">{r.label}</p>
          </div>
        ))}
      </div>
      <Section icon={Users} title="Liste des employés">
        {emps.length === 0 ? <Empty>Aucun employé.</Empty> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border"><th className={th}>Nom</th><th className={th}>Rôle</th><th className={th}>E-mail</th><th className={th}>Compte</th></tr></thead>
              <tbody className={rows}>
                {emps.map((e) => (
                  <tr key={e.id}>
                    <td className="font-medium">{e.userId ? <Link href={`/utilisateurs/${e.userId}`} className="hover:underline">{e.name}</Link> : e.name}</td>
                    <td>{ROLE[e.role] ?? e.role}</td>
                    <td className="text-muted-foreground">{maskEmail(e.email)}</td>
                    <td><StatusBadge tone={e.userId ? "success" : "neutral"}>{e.userId ? "Compte plateforme" : "Pas de compte"}</StatusBadge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

export function FleetPanel({ detail }: { detail: CompanyDetail }) {
  const link = (href: string, label: string) => <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{label} <ArrowRight size={12} aria-hidden /></Link>;
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <Section icon={Bus} title={`Bus (${detail.buses.length})`} action={link("/flotte/bus", "Tous les bus")}>
        {detail.buses.length === 0 ? <Empty>Aucun bus.</Empty> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className={th}>Plaque</th><th className={`${th} text-right`}>Statut</th></tr></thead>
            <tbody className={rows}>
              {detail.buses.map((b) => { const s = busStatusBadge(b.status); return (
                <tr key={b.id}><td><Link href={`/flotte/bus/${b.id}`} className="font-mono font-semibold hover:underline">{b.plate}</Link></td><td className="text-right"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td></tr>
              ); })}
            </tbody>
          </table>
        )}
      </Section>
      <Section icon={Clock} title={`Trajets (${detail.trips.length})`} action={link("/flotte/trajets", "Tous les trajets")}>
        {detail.trips.length === 0 ? <Empty>Aucun trajet.</Empty> : (
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border"><th className={th}>Trajet</th><th className={th}>Départ</th><th className={`${th} text-right`}>Statut</th></tr></thead>
            <tbody className={rows}>
              {detail.trips.map((t) => { const s = tripStatusBadge(t.status); return (
                <tr key={t.id}><td><Link href={`/flotte/trajets/${t.id}`} className="font-medium hover:underline">{t.route}</Link></td><td className="text-muted-foreground">{formatDateTime(t.departure)}</td><td className="text-right"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td></tr>
              ); })}
            </tbody>
          </table>
        )}
      </Section>
    </div>
  );
}

export function ActivityPanel({ detail }: { detail: CompanyDetail }) {
  return (
    <Section icon={Clock} title={`Activité récente (${formatNumber(detail.activity.length)})`}>
      {detail.activity.length === 0 ? <Empty>Aucune activité.</Empty> : (
        <table className="w-full text-sm">
          <thead><tr className="border-b border-border"><th className={th}>Date</th><th className={th}>Acteur</th><th className={th}>Action</th></tr></thead>
          <tbody className={rows}>
            {detail.activity.map((a) => (
              <tr key={a.id}><td className="whitespace-nowrap pr-4 text-muted-foreground">{formatDateTime(a.at)}</td><td className="pr-4">{a.actor}</td><td>{a.action}</td></tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}
