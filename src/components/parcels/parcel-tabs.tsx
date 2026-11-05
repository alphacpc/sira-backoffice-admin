import { ArrowRight, Buildings, CalendarBlank, CheckCircle, Info as InfoIcon, MapPin, Package, Phone, Scales, User, UserCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType } from "react";
import { RecipientPhoneField } from "@/components/parcels/recipient-phone-field";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { formatDateTime, formatMoney } from "@/lib/format";
import { parcelPaymentBadge, parcelStatusBadge, parcelTypeLabel } from "@/lib/labels";
import type { ParcelDetail } from "@/lib/repos/parcels";

const TAB_VALUES = ["resume", "itineraire", "historique"];

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: React.ReactNode }) {
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

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function ParcelTabs({ detail, initialTab }: { detail: ParcelDetail; initialTab?: string }) {
  const { parcel: p } = detail;
  const status = parcelStatusBadge(p.status);
  const payment = parcelPaymentBadge(p.paymentStatus);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <div className="space-y-5">
          <Panel title="Vue d'ensemble">
            <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 p-5">
              <Package size={36} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
              <div className="min-w-0 flex-1">
                <p className="font-mono text-lg font-bold">{p.parcelCode}</p>
                <p className="text-sm text-muted-foreground">Suivi : <span className="font-mono">{p.trackingNumber}</span></p>
              </div>
              <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
              <StatusBadge tone={payment.tone}>{payment.label}</StatusBadge>
              <p className="text-3xl font-bold tabular-nums">{formatMoney(p.shippingFee, p.currency)}</p>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-3 text-sm">
              <MapPin size={22} weight="duotone" aria-hidden className="text-orange-500" />
              <span className="font-semibold">{detail.originName}</span>
              <ArrowRight size={16} aria-hidden className="text-muted-foreground" />
              <span className="font-semibold">{detail.destinationName}</span>
            </div>
          </Panel>
          <div className="grid gap-5 lg:grid-cols-2">
            <Panel title="Personnes">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${p.companyId}`} className="hover:underline">{detail.companyName}</Link></Info>
                <Info icon={User} label="Expéditeur">
                  {p.senderCustomerId ? <Link href={`/clients/comptes/${p.senderCustomerId}`} className="hover:underline">{p.senderName}</Link> : p.senderName}
                </Info>
                <Info icon={UserCircle} label="Destinataire">{p.recipientName}</Info>
                <Info icon={Phone} label="Téléphone du destinataire"><RecipientPhoneField parcelId={p.id} masked={detail.recipientPhoneMasked} /></Info>
              </div>
            </Panel>
            <Panel title="Contenu et dates">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={Package} label="Type">{parcelTypeLabel(p.parcelType)}</Info>
                <Info icon={Scales} label="Poids">{p.weightKg} kg</Info>
                <Info icon={CalendarBlank} label="Prise en charge">{formatDateTime(p.pickupAt)}</Info>
                <Info icon={CalendarBlank} label="Livraison prévue">{formatDateTime(p.expectedDeliveryAt)}</Info>
                <Info icon={CheckCircle} label="Livré le">{p.actualDeliveryAt ? formatDateTime(p.actualDeliveryAt) : "—"}</Info>
                <Info icon={CalendarBlank} label="Créé le">{formatDateTime(p.createdAt)}</Info>
              </div>
            </Panel>
          </div>
          {p.description && (
            <Panel title="Description">
              <p className="flex gap-3 text-sm"><InfoIcon size={22} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />{p.description}</p>
            </Panel>
          )}
        </div>
      ),
    },
    {
      value: "itineraire", label: "Itinéraire",
      content: (
        <Panel title={`Itinéraire (${detail.legs.length} jambe${detail.legs.length > 1 ? "s" : ""})`}>
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr><th className={TH}>Jambe</th><th className={TH}>Trajet</th><th className={TH}>Départ</th><th className={TH}>Code d&apos;affectation</th></tr>
            </thead>
            <tbody className="[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0">
              {detail.legs.map((l) => (
                <tr key={l.id}>
                  <td className="font-semibold tabular-nums">{l.sequence}</td>
                  <td><Link href={`/flotte/trajets/${l.tripId}`} className="font-medium hover:underline">{l.routeLabel}</Link></td>
                  <td>{l.departure ? formatDateTime(l.departure) : "—"}</td>
                  <td className="font-mono text-xs">{l.assignmentCode}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Panel>
      ),
    },
    {
      value: "historique", label: "Historique",
      content: (
        <Panel title={`Historique (${detail.history.length})`}>
          <ol className="relative ml-2 space-y-5 border-l border-border pl-6">
            {detail.history.map((h) => {
              const badge = parcelStatusBadge(h.newStatus);
              return (
                <li key={h.id} className="relative text-sm">
                  <span aria-hidden className="absolute -left-[31px] top-1.5 size-2.5 rounded-full bg-orange-500 ring-4 ring-card" />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                    <span className="text-muted-foreground">{h.changedBy ?? "Création du colis"}</span>
                  </div>
                  {h.notes && <p className="mt-1">{h.notes}</p>}
                  <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">{formatDateTime(h.changedAt)}</p>
                </li>
              );
            })}
          </ol>
        </Panel>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
