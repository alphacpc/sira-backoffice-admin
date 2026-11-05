import { Buildings, CalendarBlank, CheckCircle, Cpu, FileText, Globe, Siren, User } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { IncidentActions } from "@/components/monitoring/incident-actions";
import { serviceFilterHref } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import { impactScopeLabel, incidentStatusBadge, severityBadge } from "@/lib/labels";
import { incidentsRepo } from "@/lib/repos/monitoring";

export const dynamic = "force-dynamic";

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

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function duration(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h >= 24 ? `${Math.floor(h / 24)} j ${h % 24} h` : m === 0 ? `${h} h` : `${h} h ${m} min`;
}

export default async function IncidentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = incidentsRepo.detail(id, new Date());
  if (!detail) notFound();
  const { incident: i } = detail;
  const status = incidentStatusBadge(i.status);
  const severity = severityBadge(i.severity);
  return (
    <>
      <PageHeader
        title={i.title}
        description={`${i.incidentCode} · ${i.serviceName}`}
        actions={
          <>
            <span data-testid="incident-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            <IncidentActions incidentId={i.id} status={i.status} postmortemUrl={i.postmortemUrl} />
          </>
        }
      />
      {i.status === "RESOLVED" && (
        <p data-testid="incident-resolved-note" className="mb-4 text-sm text-muted-foreground">
          Incident résolu : seul le postmortem peut encore être renseigné ou modifié.
        </p>
      )}
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <Siren size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{i.title}</p>
            <p className="text-sm text-muted-foreground"><span className="font-mono">{i.incidentCode}</span> · {i.serviceName}</p>
          </div>
          <StatusBadge tone={severity.tone}>{severity.label}</StatusBadge>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <div className="text-right">
            <p className="text-2xl font-bold tabular-nums" data-testid="incident-duration">{duration(detail.durationMinutes)}</p>
            <p className="text-sm text-muted-foreground">{i.resolvedAt ? "Durée" : "Ouvert depuis"}</p>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Description">
            {i.description
              ? <blockquote className="border-l-2 border-orange-500 pl-4 text-sm leading-relaxed">{i.description}</blockquote>
              : <p className="text-sm text-muted-foreground">Aucune description.</p>}
            <p className="mt-4 text-xs text-muted-foreground">Seul l&apos;état courant est conservé : l&apos;historique des changements de statut n&apos;existe pas.</p>
          </Section>
          <Section title="Postmortem">
            <div className="flex items-center gap-3">
              <FileText size={28} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
              {i.postmortemUrl
                ? <a data-testid="incident-postmortem" href={i.postmortemUrl} target="_blank" rel="noreferrer noopener" className="text-sm font-semibold text-accent-text hover:underline">Ouvrir le compte rendu</a>
                : <span data-testid="incident-postmortem" className="text-sm text-muted-foreground">Aucun</span>}
            </div>
          </Section>
        </div>

        <Section title="Détails">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={Cpu} label="Service"><Link href={serviceFilterHref("/supervision/services", i.serviceName)} className="hover:underline">{i.serviceName}</Link></Info>
            <Info icon={Globe} label="Portée">{impactScopeLabel(i.impactScope)}</Info>
            <Info icon={Buildings} label="Compagnie touchée">
              {i.affectedCompanyId && detail.companyName ? <Link href={`/compagnies/${i.affectedCompanyId}`} className="hover:underline">{detail.companyName}</Link> : "—"}
            </Info>
            <Info icon={CalendarBlank} label="Détecté le">{formatDateTime(i.detectedAt)}</Info>
            <Info icon={CheckCircle} label="Résolu le">{i.resolvedAt ? formatDateTime(i.resolvedAt) : "—"}</Info>
            <Info icon={User} label="Déclaré par">{i.reportedBy}</Info>
          </div>
        </Section>
      </div>
    </>
  );
}
