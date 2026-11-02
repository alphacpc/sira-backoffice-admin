import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { IncidentActions } from "@/components/monitoring/incident-actions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { serviceFilterHref } from "@/lib/filters";
import { formatDateTime } from "@/lib/format";
import { impactScopeLabel, incidentStatusBadge, severityBadge } from "@/lib/labels";
import { incidentsRepo } from "@/lib/repos/monitoring";

export const dynamic = "force-dynamic";

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
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Incident</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Gravité"><StatusBadge tone={severity.tone}>{severity.label}</StatusBadge></DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Service">
              <Link href={serviceFilterHref("/supervision/services", i.serviceName)} className="hover:underline">{i.serviceName}</Link>
            </DetailRow>
            <DetailRow label="Portée">{impactScopeLabel(i.impactScope)}</DetailRow>
            <DetailRow label="Compagnie touchée">
              {i.affectedCompanyId && detail.companyName
                ? <Link href={`/compagnies/${i.affectedCompanyId}`} className="hover:underline">{detail.companyName}</Link>
                : "—"}
            </DetailRow>
            <DetailRow label="Détecté le">{formatDateTime(i.detectedAt)}</DetailRow>
            <DetailRow label="Résolu le">{i.resolvedAt ? formatDateTime(i.resolvedAt) : "—"}</DetailRow>
            <DetailRow label={i.resolvedAt ? "Durée" : "Ouvert depuis"}>
              <span data-testid="incident-duration">{duration(detail.durationMinutes)}</span>
            </DetailRow>
            <DetailRow label="Déclaré par">{i.reportedBy}</DetailRow>
            <DetailRow label="Postmortem">
              {i.postmortemUrl
                ? <a data-testid="incident-postmortem" href={i.postmortemUrl} target="_blank" rel="noreferrer noopener" className="text-accent-text hover:underline">Ouvrir le compte rendu</a>
                : <span data-testid="incident-postmortem">Aucun</span>}
            </DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Description</CardTitle></CardHeader>
          <CardContent>
            {i.description ? <p className="text-sm">{i.description}</p> : <p className="text-sm text-muted-foreground">Aucune description.</p>}
            <p className="mt-4 text-xs text-muted-foreground">Seul l&apos;état courant est conservé : l&apos;historique des changements de statut n&apos;existe pas.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
