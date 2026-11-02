import Link from "next/link";
import { notFound } from "next/navigation";
import { IgnoreFeedbackButton } from "@/components/clients/ignore-feedback-button";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { feedbackStatusBadge, feedbackTypeLabel, ratingStars } from "@/lib/labels";
import { feedbackRepo } from "@/lib/repos/clients";

export const dynamic = "force-dynamic";

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = feedbackRepo.detail(id);
  if (!detail) notFound();
  const { feedback: f } = detail;
  const status = feedbackStatusBadge(f.status);
  const canIgnore = f.status === "PENDING" || f.status === "REVIEWED";
  return (
    <>
      <PageHeader
        title={f.title}
        description={`${detail.customerName} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="feedback-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {canIgnore && <IgnoreFeedbackButton feedbackId={f.id} title={f.title} />}
          </>
        }
      />
      {!canIgnore && detail.ignoreBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="ignore-blocked">
          Modération impossible : {detail.ignoreBlockedReason}.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Avis</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Client">
              <Link href={`/clients/comptes/${f.customerId}`} className="hover:underline">{detail.customerName}</Link>
            </DetailRow>
            <DetailRow label="Compagnie">
              <Link href={`/compagnies/${f.companyId}`} className="hover:underline">{detail.companyName}</Link>
            </DetailRow>
            <DetailRow label="Type">{feedbackTypeLabel(f.feedbackType)}</DetailRow>
            <DetailRow label="Note"><span aria-label={`Note ${f.rating} sur 5`}>{ratingStars(f.rating)}</span></DetailRow>
            <DetailRow label="Déposé le">{formatDateTime(f.createdAt)}</DetailRow>
            <DetailRow label="Trajet">
              {f.tripId && detail.tripLabel
                ? <Link href={`/flotte/trajets/${f.tripId}`} className="hover:underline">{detail.tripLabel}</Link> : "—"}
            </DetailRow>
            <DetailRow label="Réservation">
              {f.bookingId && detail.bookingCode
                ? <Link href={`/ventes/reservations/${f.bookingId}`} className="hover:underline">{detail.bookingCode}</Link> : "—"}
            </DetailRow>
            <DetailRow label="Colis">
              {f.parcelId && detail.parcelCode
                ? <Link href={`/colis/${f.parcelId}`} className="hover:underline">{detail.parcelCode}</Link> : "—"}
            </DetailRow>
          </dl></CardContent>
        </Card>
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle>Commentaire</CardTitle></CardHeader>
            <CardContent><p className="text-sm">{f.comment}</p></CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle>Réponse de la compagnie</CardTitle></CardHeader>
            <CardContent>
              {f.response ? (
                <>
                  <p className="text-sm">{f.response}</p>
                  {f.respondedAt && <p className="mt-2 text-xs text-muted-foreground">Répondu le {formatDateTime(f.respondedAt)}</p>}
                </>
              ) : <p className="text-sm text-muted-foreground">Aucune réponse.</p>}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
