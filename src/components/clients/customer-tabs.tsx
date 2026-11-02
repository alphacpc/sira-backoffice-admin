import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney, formatNumber } from "@/lib/format";
import {
  bookingPaymentBadge, bookingStatusBadge, feedbackStatusBadge, feedbackTypeLabel, membershipLabel, ratingStars,
  rewardLabel, sponsorshipStatusBadge,
} from "@/lib/labels";
import type { CustomerDetail } from "@/lib/repos/clients";

const TAB_VALUES = ["profil", "fidelite", "parrainage", "reservations", "avis"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function CustomerTabs({ detail, initialTab }: { detail: CustomerDetail; initialTab?: string }) {
  const { customer: c } = detail;

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Nom">{c.name}</DetailRow>
          <DetailRow label="Type"><span data-testid="customer-kind">{c.isCorporate ? "Entreprise" : "Particulier"}</span></DetailRow>
          <DetailRow label="Compte utilisateur">
            <Link href={`/utilisateurs/${detail.userId}`} className="hover:underline">Voir le compte</Link>
          </DetailRow>
          <DetailRow label="État du compte">{detail.userStatus === "active" ? "Actif" : "Suspendu"}</DetailRow>
          <DetailRow label="Colis envoyés">{detail.parcelCount}</DetailRow>
          <DetailRow label="Client depuis le">{formatDate(c.createdAt)}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "fidelite", label: "Fidélité",
      content: (
        <div className="space-y-4">
          <Card><CardContent>
            <p className="text-sm text-muted-foreground">Points cumulés (toutes compagnies)</p>
            <p data-testid="loyalty-total" className="text-2xl font-semibold tabular-nums">{formatNumber(detail.totalPoints)} pts</p>
          </CardContent></Card>
          {detail.accounts.length === 0 ? <Empty>Aucun compte de fidélité.</Empty> : detail.accounts.map((a) => (
            <Card key={a.id}><CardContent>
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/compagnies/${a.companyId}`} className="font-medium hover:underline">{a.companyName}</Link>
                  <span className="ml-2 text-sm text-muted-foreground">{a.programName ?? "Aucun programme"}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <StatusBadge tone="info">{membershipLabel(a.membershipType)}</StatusBadge>
                  <span className="tabular-nums font-medium">{formatNumber(a.points)} pts</span>
                </div>
              </div>
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Date</th>
                    <th className="py-1 font-medium">Réservation</th>
                    <th className="py-1 font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {a.movements.map((m) => (
                    <tr key={m.id} className="border-t border-border">
                      <td className="py-1.5">{formatDateTime(m.createdAt)}</td>
                      <td><Link href={`/ventes/reservations/${m.bookingId}`} className="hover:underline">{m.bookingCode}</Link></td>
                      <td className="tabular-nums">+{m.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent></Card>
          ))}
        </div>
      ),
    },
    {
      value: "parrainage", label: "Parrainage",
      content: (
        <div className="space-y-4">
          <Card><CardContent>
            {detail.sponsoredBy ? (
              <p className="text-sm" data-testid="sponsored-by">
                Parrainé par <span className="font-medium">{detail.sponsoredBy.sponsorName}</span> avec le code{" "}
                {detail.sponsoredBy.code} ({detail.sponsoredBy.companyName}) le {formatDate(detail.sponsoredBy.at)}.
              </p>
            ) : <Empty>Ce client n&apos;a pas été parrainé.</Empty>}
          </CardContent></Card>
          <Card><CardContent>
            {detail.sponsorships.length === 0 ? <Empty>Aucun code de parrainage généré.</Empty> : (
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="py-1 font-medium">Code</th>
                    <th className="py-1 font-medium">Compagnie</th>
                    <th className="py-1 font-medium">Récompense</th>
                    <th className="py-1 font-medium">Statut</th>
                    <th className="py-1 font-medium">Expire le</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.sponsorships.map((x) => {
                    const badge = sponsorshipStatusBadge(x.status);
                    return (
                      <tr key={x.id} data-testid="sponsorship-row" className="border-t border-border">
                        <td className="py-1.5 font-medium">{x.code}</td>
                        <td>{x.companyName}</td>
                        <td>{rewardLabel(x.rewardType, x.rewardValue, x.currency)}</td>
                        <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                        <td>{formatDate(x.expiresAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent></Card>
        </div>
      ),
    },
    {
      value: "reservations", label: "Réservations",
      content: (
        <Card><CardContent>
          {detail.bookings.length === 0 ? <Empty>Aucune réservation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Code</th>
                  <th className="py-1 font-medium">Trajet</th>
                  <th className="py-1 font-medium">Montant</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Paiement</th>
                  <th className="py-1 font-medium">Créée le</th>
                </tr>
              </thead>
              <tbody>
                {detail.bookings.map((b) => {
                  const status = bookingStatusBadge(b.status);
                  const payment = bookingPaymentBadge(b.paymentStatus);
                  return (
                    <tr key={b.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/ventes/reservations/${b.id}`} className="font-medium hover:underline">{b.bookingCode}</Link>
                      </td>
                      <td>{b.routeLabel}{b.departure ? ` · ${formatDateTime(b.departure)}` : ""}</td>
                      <td className="tabular-nums">{formatMoney(b.amount, b.currency)}</td>
                      <td><StatusBadge tone={status.tone}>{status.label}</StatusBadge></td>
                      <td><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></td>
                      <td>{formatDateTime(b.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">Les dix réservations les plus récentes.</p>
        </CardContent></Card>
      ),
    },
    {
      value: "avis", label: "Avis",
      content: (
        <Card><CardContent>
          {detail.feedbacks.length === 0 ? <Empty>Aucun avis.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Titre</th>
                  <th className="py-1 font-medium">Compagnie</th>
                  <th className="py-1 font-medium">Type</th>
                  <th className="py-1 font-medium">Note</th>
                  <th className="py-1 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {detail.feedbacks.map((f) => {
                  const badge = feedbackStatusBadge(f.status);
                  return (
                    <tr key={f.id} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/clients/avis/${f.id}`} className="font-medium hover:underline">{f.title}</Link>
                      </td>
                      <td>{f.companyName}</td>
                      <td>{feedbackTypeLabel(f.feedbackType)}</td>
                      <td aria-label={`Note ${f.rating} sur 5`}>{ratingStars(f.rating)}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
