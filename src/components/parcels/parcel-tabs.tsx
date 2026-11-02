import Link from "next/link";
import { RecipientPhoneField } from "@/components/parcels/recipient-phone-field";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime, formatMoney } from "@/lib/format";
import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";
import type { ParcelDetail } from "@/lib/repos/parcels";

const TAB_VALUES = ["resume", "itineraire", "historique"];

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function ParcelTabs({ detail, initialTab }: { detail: ParcelDetail; initialTab?: string }) {
  const { parcel: p } = detail;
  const status = parcelStatusBadge(p.status);
  const payment = parcelPaymentBadge(p.paymentStatus);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Code">{p.parcelCode}</DetailRow>
          <DetailRow label="Numéro de suivi">{p.trackingNumber}</DetailRow>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${p.companyId}`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Expéditeur">
            {p.senderCustomerId
              ? <Link href={`/clients/comptes/${p.senderCustomerId}`} className="hover:underline">{p.senderName}</Link>
              : p.senderName}
          </DetailRow>
          <DetailRow label="Destinataire">{p.recipientName}</DetailRow>
          <DetailRow label="Téléphone du destinataire">
            <RecipientPhoneField parcelId={p.id} masked={detail.recipientPhoneMasked} />
          </DetailRow>
          <DetailRow label="Origine">{detail.originName}</DetailRow>
          <DetailRow label="Destination">{detail.destinationName}</DetailRow>
          <DetailRow label="Type">{parcelTypeLabel(p.parcelType)}</DetailRow>
          <DetailRow label="Description">{p.description}</DetailRow>
          <DetailRow label="Poids">{p.weightKg} kg</DetailRow>
          <DetailRow label="Frais d'expédition">{formatMoney(p.shippingFee, p.currency)}</DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Paiement"><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></DetailRow>
          <DetailRow label="Prise en charge">{formatDateTime(p.pickupAt)}</DetailRow>
          <DetailRow label="Livraison prévue">{formatDateTime(p.expectedDeliveryAt)}</DetailRow>
          <DetailRow label="Livré le">{p.actualDeliveryAt ? formatDateTime(p.actualDeliveryAt) : "—"}</DetailRow>
          <DetailRow label="Créé le">{formatDateTime(p.createdAt)}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "itineraire", label: "Itinéraire",
      content: (
        <Card><CardContent>
          <table className="w-full text-left text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="py-1 font-medium">Jambe</th>
                <th className="py-1 font-medium">Trajet</th>
                <th className="py-1 font-medium">Départ</th>
                <th className="py-1 font-medium">Code d&apos;affectation</th>
              </tr>
            </thead>
            <tbody>
              {detail.legs.map((l) => (
                <tr key={l.id} className="border-t border-border">
                  <td className="py-1.5">{l.sequence}</td>
                  <td>
                    <Link href={`/flotte/trajets/${l.tripId}`} className="font-medium hover:underline">{l.routeLabel}</Link>
                  </td>
                  <td>{l.departure ? formatDateTime(l.departure) : "—"}</td>
                  <td>{l.assignmentCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent></Card>
      ),
    },
    {
      value: "historique", label: "Historique",
      content: (
        <Card><CardContent>
          <ol className="space-y-2 text-sm">
            {detail.history.map((h) => {
              const badge = parcelStatusBadge(h.newStatus);
              return (
                <li key={h.id} className="flex flex-wrap items-center gap-3 border-b border-border pb-2 last:border-0">
                  <span className="w-36 shrink-0 text-muted-foreground tabular-nums">{formatDateTime(h.changedAt)}</span>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  <span className="text-muted-foreground">{h.changedBy ?? "Création du colis"}</span>
                  {h.notes && <span>{h.notes}</span>}
                </li>
              );
            })}
          </ol>
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
