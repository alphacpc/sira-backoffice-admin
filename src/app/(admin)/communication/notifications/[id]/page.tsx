import Link from "next/link";
import { notFound } from "next/navigation";
import { NotificationContent } from "@/components/communication/notification-content";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { notificationChannelLabel, notificationStatusBadge, notificationTypeLabel } from "@/lib/labels";
import { notificationsRepo } from "@/lib/repos/communication";

export const dynamic = "force-dynamic";

export default async function NotificationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = notificationsRepo.detail(id);
  if (!detail) notFound();
  const { notification: n } = detail;
  const status = notificationStatusBadge(n.status);
  return (
    <>
      <PageHeader
        title={`Notification ${n.notificationCode}`}
        description={`${notificationTypeLabel(n.notificationType)} · ${detail.companyName}`}
        actions={<span data-testid="notification-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Envoi</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Canal">{notificationChannelLabel(n.channel)}</DetailRow>
            <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
            <DetailRow label="Tentatives de renvoi">{n.retryCount}</DetailRow>
            <DetailRow label="Lue">{n.read ? "Oui" : "Non"}</DetailRow>
            <DetailRow label="Créée le">{formatDateTime(n.createdAt)}</DetailRow>
            <DetailRow label="Envoyée le">{n.sentAt ? formatDateTime(n.sentAt) : "—"}</DetailRow>
            <DetailRow label="Compagnie">
              <Link href={`/compagnies/${n.companyId}`} className="hover:underline">{detail.companyName}</Link>
            </DetailRow>
            <DetailRow label="Destinataire">
              {detail.recipientUserId
                ? <Link href={`/utilisateurs/${detail.recipientUserId}`} className="hover:underline">{detail.recipientName}</Link>
                : detail.recipientName}
            </DetailRow>
            <DetailRow label="Objet lié">
              {detail.entity ? <Link href={detail.entity.href} className="hover:underline">{detail.entity.label}</Link> : "—"}
            </DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Contenu</CardTitle></CardHeader>
          <CardContent><NotificationContent notificationId={n.id} /></CardContent>
        </Card>
      </div>
    </>
  );
}
