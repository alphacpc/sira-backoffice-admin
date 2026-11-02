import Link from "next/link";
import { notFound } from "next/navigation";
import { DsrActions } from "@/components/compliance/dsr-actions";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatDateTime } from "@/lib/format";
import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";
import { dsrRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default async function DataSubjectRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = dsrRepo.detail(id, new Date());
  if (!detail) notFound();
  const { request: r } = detail;
  const status = dsrStatusBadge(r.status);
  const open = r.status === "RECEIVED" || r.status === "IN_PROGRESS";
  return (
    <>
      <PageHeader
        title={`${dsrTypeLabel(r.requestType)} · ${detail.requesterName}`}
        description={`Demande reçue le ${formatDate(r.createdAt)}`}
        actions={
          <>
            <span data-testid="dsr-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {open && <DsrActions requestId={r.id} status={r.status as "RECEIVED" | "IN_PROGRESS"} />}
          </>
        }
      />
      {!open && (
        <p data-testid="dsr-closed-note" className="mb-4 text-sm text-muted-foreground">
          Cette demande est close : elle ne peut plus être modifiée.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Demande</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Demandeur">
              <Link href={`/utilisateurs/${detail.requesterUserId}`} className="hover:underline">{detail.requesterName}</Link>
            </DetailRow>
            <DetailRow label="Compagnie">
              {r.companyId ? <Link href={`/compagnies/${r.companyId}`} className="hover:underline">{detail.companyName}</Link> : "Niveau plateforme"}
            </DetailRow>
            <DetailRow label="Type">{dsrTypeLabel(r.requestType)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Échéance légale">{formatDate(r.dueDate)}</DetailRow>
            <DetailRow label="Délai">
              <span data-testid="dsr-countdown">
                {detail.daysLeft === null ? "—" : detail.overdue ? `En retard de ${-detail.daysLeft} j` : `${detail.daysLeft} j restants`}
              </span>
            </DetailRow>
            <DetailRow label="Traitée par">{r.handledBy ?? "—"}</DetailRow>
            <DetailRow label="Résolue le">{r.resolvedAt ? formatDateTime(r.resolvedAt) : "—"}</DetailRow>
          </dl></CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Motif du demandeur</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{r.reason}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Notes de résolution</CardTitle></CardHeader>
            <CardContent>
              {r.resolutionNotes
                ? <p data-testid="dsr-resolution" className="text-sm">{r.resolutionNotes}</p>
                : <p className="text-sm text-muted-foreground">Aucune note pour le moment.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
