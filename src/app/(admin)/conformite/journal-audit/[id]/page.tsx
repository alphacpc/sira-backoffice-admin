import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { auditActionLabel, auditActorTypeLabel } from "@/lib/labels";
import { auditRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default async function AuditLineDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = auditRepo.detail(id);
  if (!detail) notFound();
  const { row } = detail;
  return (
    <>
      <PageHeader
        title={`${auditActionLabel(row.action)} · ${row.entityType}`}
        description={`${row.companyName} · ${formatDateTime(row.createdAt)}`}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Origine</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Acteur">{row.actorLabel}</DetailRow>
            <DetailRow label="Type d'acteur">{auditActorTypeLabel(row.actorType)}</DetailRow>
            <DetailRow label="Compagnie">
              {row.companyId ? <Link href={`/compagnies/${row.companyId}`} className="hover:underline">{row.companyName}</Link> : row.companyName}
            </DetailRow>
            <DetailRow label="Service source">{row.sourceService ?? "—"}</DetailRow>
            <DetailRow label="Adresse IP">{row.ipTruncated}</DetailRow>
            <DetailRow label="Agent utilisateur">{detail.userAgent}</DetailRow>
            <DetailRow label="Reçue le">{formatDateTime(row.createdAt)}</DetailRow>
            <DetailRow label="Survenue le (horloge du producteur)">{detail.occurredAt ? formatDateTime(detail.occurredAt) : "—"}</DetailRow>
            <DetailRow label="Entité">{row.entityType}</DetailRow>
            <DetailRow label="Identifiant">{detail.entityId}</DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avant / après</CardTitle></CardHeader>
          <CardContent>
            {detail.changes.length === 0 ? (
              <p className="text-sm text-muted-foreground">Cette action n&apos;enregistre aucun état.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Champ</th>
                    <th className="py-1 font-medium">Avant</th>
                    <th className="py-1 font-medium">Après</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.changes.map((c) => (
                    <tr
                      key={c.key} data-testid="audit-change" data-changed={c.changed ? "true" : "false"}
                      className={`border-t border-border ${c.changed ? "bg-warning/10" : ""}`}
                    >
                      <td className="py-1.5 font-medium">{c.key}</td>
                      <td>{c.before ?? "—"}</td>
                      <td>{c.after ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
