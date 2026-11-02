import { ArrowRight, Clock, Eye, FileText, Prohibit, ShieldCheck, UsersThree, Warning } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { Donut, type DonutTone } from "@/components/dashboard/donut";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatDateTime, formatNumber } from "@/lib/format";
import { auditActionLabel, consentTypeLabel, dataCategoryLabel, dsrTypeLabel } from "@/lib/labels";
import type { ComplianceOverview } from "@/lib/repos/compliance-hub";
import { cn } from "@/lib/utils";
import { ActorAvatar } from "./pills";

const CARD = "rounded-2xl bg-white p-6 shadow-card dark:bg-card";
const TONES: DonutTone[] = ["accent", "info", "success", "warning", "danger", "neutral"];

function Head({ title, href, link }: { title: string; href?: string; link?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="font-semibold">{title}</h3>
      {href && <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-accent-text hover:underline">{link ?? "Voir tout"} <ArrowRight size={12} aria-hidden /></Link>}
    </div>
  );
}

export function ComplianceOverviewView({ o }: { o: ComplianceOverview }) {
  const maxConsent = Math.max(1, ...o.consents.byType.map((c) => c.granted + c.withdrawn));
  return (
    <div className="space-y-5">
      <section aria-label="Indicateurs" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Actions journalisées" value={formatNumber(o.audit.total)} hint={`${formatNumber(o.audit.last7)} sur 7 jours`} icon={FileText} tone="info" />
        <StatTile label="Demandes RGPD ouvertes" value={formatNumber(o.requests.open)} hint={o.requests.overdue ? `${o.requests.overdue} en retard` : "aucune en retard"} icon={o.requests.overdue ? Warning : ShieldCheck} tone={o.requests.overdue ? "danger" : "success"} />
        <StatTile label="Taux de consentement" value={o.consents.rate === null ? "—" : `${o.consents.rate} %`} hint={`${formatNumber(o.consents.withdrawn)} retrait(s)`} icon={UsersThree} tone="accent" />
        <StatTile label="À anonymiser" value={formatNumber(o.retention.pending)} hint={`${o.retention.custom} durée(s) personnalisée(s)`} icon={Clock} tone="warning" />
      </section>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={cn(CARD, "xl:col-span-2")} aria-label="Demandes à traiter">
          <Head title="Demandes à traiter" href="/conformite/demandes-rgpd" link="Toutes les demandes" />
          {o.requests.urgent.length === 0 && <p className="text-sm text-muted-foreground">Aucune demande ouverte.</p>}
          <ul className="space-y-3">
            {o.requests.urgent.map((r) => (
              <li key={r.id}>
                <Link href={`/conformite/demandes-rgpd/${r.id}`} className="flex items-center gap-4 rounded-xl border border-border p-3 hover:bg-muted">
                  <ActorAvatar name={r.requesterName} />
                  <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{r.requesterName}</p><p className="truncate text-xs text-muted-foreground">{dsrTypeLabel(r.requestType)} · {r.companyName}</p></div>
                  <span className={cn("shrink-0 rounded-full px-3 py-1 text-xs font-semibold", r.overdue ? "bg-rose-100 text-rose-800" : (r.daysLeft ?? 99) <= 7 ? "bg-amber-100 text-amber-800" : "bg-muted text-muted-foreground")}>
                    {r.overdue ? `${-(r.daysLeft ?? 0)} j de retard` : `${r.daysLeft} j restants`}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className={CARD} aria-label="Consentements">
          <Head title="Consentements par type" href="/conformite/consentements" />
          <ul className="space-y-4">
            {o.consents.byType.map((c) => (
              <li key={c.consentType}>
                <div className="flex items-baseline justify-between gap-2 text-sm"><span className="truncate font-medium">{consentTypeLabel(c.consentType)}</span><span className="tabular-nums text-muted-foreground">{c.rate ?? "—"} %</span></div>
                <div className="mt-1.5 flex h-1.5 overflow-hidden rounded-full bg-muted" style={{ width: `${Math.max(12, ((c.granted + c.withdrawn) / maxConsent) * 100)}%` }}>
                  <div className="bg-lime-500" style={{ width: `${c.rate ?? 0}%` }} /><div className="bg-rose-400" style={{ width: `${100 - (c.rate ?? 0)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className={CARD} aria-label="Actions du journal">
          <Head title="Journal par type d'action" href="/conformite/journal-audit" />
          <Donut data={o.audit.byAction.map((a, i) => ({ label: auditActionLabel(a.action), value: a.value, tone: TONES[i % TONES.length] }))} centerLabel="actions" />
        </section>
        <section className={CARD} aria-label="Accès aux données">
          <Head title="Accès aux données" href="/conformite/acces-donnees" />
          <Donut data={o.access.byCategory.map((a, i) => ({ label: dataCategoryLabel(a.category), value: a.value, tone: TONES[i % TONES.length] }))} centerLabel="accès" />
          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground"><Eye size={14} weight="duotone" aria-hidden />{o.access.last7} sur 7 jours · {o.access.exports} export(s)</p>
        </section>
        <section className={CARD} aria-label="Échecs de connexion">
          <Head title="Échecs de connexion" href="/conformite/journal-audit?action=LOGIN_FAILED" />
          {o.audit.recentFailures.length === 0 && <p className="flex items-center gap-2 text-sm text-lime-600"><ShieldCheck size={18} weight="duotone" aria-hidden />Aucun échec récent.</p>}
          <ul className="space-y-2.5">
            {o.audit.recentFailures.map((f) => (
              <li key={f.id}><Link href={`/conformite/journal-audit/${f.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 hover:bg-muted"><Prohibit size={20} weight="fill" aria-hidden className="shrink-0 text-rose-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{f.actorLabel}</p><p className="truncate text-xs text-muted-foreground">{formatDateTime(f.createdAt)} · {f.ipTruncated}</p></div></Link></li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">{o.audit.failedLogins} au total</p>
        </section>
      </div>
    </div>
  );
}
