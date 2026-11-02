import Link from "next/link";
import { notFound } from "next/navigation";
import { DetailRow } from "@/components/data/detail-row";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateTime } from "@/lib/format";
import { ticketStatusBadge } from "@/lib/labels";
import { ticketsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default async function TicketPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const detail = ticketsRepo.detailByCode(decodeURIComponent(code));
  if (!detail) notFound();
  const { ticket: t, scans } = detail;
  const status = ticketStatusBadge(t.status);
  return (
    <>
      <PageHeader
        title={`Billet ${t.ticketCode}`}
        description={`${t.passengerName} · ${t.companyName}`}
        actions={<span data-testid="ticket-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>}
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Billet</CardTitle></CardHeader>
          <CardContent><dl>
            <DetailRow label="Réservation">
              <Link href={`/ventes/reservations/${t.bookingId}`} className="hover:underline">{t.bookingCode}</Link>
            </DetailRow>
            <DetailRow label="Trajet">{t.routeLabel} · {formatDateTime(t.departure)}</DetailRow>
            <DetailRow label="Siège">{t.seatNumber ?? "—"}</DetailRow>
            <DetailRow label="Émis le">{formatDateTime(t.issuedAt)}</DetailRow>
          </dl></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scans</CardTitle></CardHeader>
          <CardContent>
            {scans.length === 0 ? <p className="text-sm text-muted-foreground">Aucun scan.</p> : (
              <ul data-testid="ticket-scans" className="space-y-1 text-sm">
                {scans.map((at, i) => <li key={`${at}-${i}`}>{formatDateTime(at)}</li>)}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
