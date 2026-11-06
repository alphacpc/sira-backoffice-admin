import { Buildings, CalendarBlank, Gift, Package, Star, User, UserCircle } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function CustomerTabs({ detail, initialTab }: { detail: CustomerDetail; initialTab?: string }) {
  const { customer: c } = detail;

  const items = [
    {
      value: "profil", label: "Profil",
      content: (
        <Panel title="Vue d'ensemble">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 p-5">
            {c.isCorporate
              ? <Buildings size={36} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
              : <UserCircle size={36} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />}
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{c.name}</p>
              <p className="text-sm text-muted-foreground" data-testid="customer-kind">{c.isCorporate ? "Entreprise" : "Particulier"}</p>
            </div>
            <StatusBadge tone={detail.userStatus === "active" ? "success" : "danger"}>{detail.userStatus === "active" ? "Compte actif" : "Compte suspendu"}</StatusBadge>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info icon={User} label="Compte utilisateur"><Link href={`/utilisateurs/${detail.userId}`} className="hover:underline">Voir le compte</Link></Info>
            {detail.parcelCount !== null && <Info icon={Package} label="Colis envoyés">{detail.parcelCount}</Info>}
            <Info icon={Star} label="Points cumulés">{formatNumber(detail.totalPoints)} pts</Info>
            <Info icon={CalendarBlank} label="Client depuis le">{formatDate(c.createdAt)}</Info>
          </div>
        </Panel>
      ),
    },
    {
      value: "fidelite", label: "Fidélité",
      content: (
        <div className="space-y-4">
          <section className="flex items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
            <Star size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Points cumulés (toutes compagnies)</p>
              <p data-testid="loyalty-total" className="text-3xl font-bold tabular-nums">{formatNumber(detail.totalPoints)} pts</p>
            </div>
            <p className="text-sm text-muted-foreground">{detail.accounts.length} compte{detail.accounts.length > 1 ? "s" : ""}</p>
          </section>
          {detail.accounts.length === 0 ? <Empty>Aucun compte de fidélité.</Empty> : detail.accounts.map((a) => (
            <Panel key={a.id} title={a.programName ?? "Aucun programme"}>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <Link href={`/compagnies/${a.companyId}`} className="font-medium hover:underline">{a.companyName}</Link>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <StatusBadge tone="info">{membershipLabel(a.membershipType)}</StatusBadge>
                  <span className="text-lg font-bold tabular-nums">{formatNumber(a.points)} pts</span>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className={TH}>Date</th>
                    <th className={TH}>Réservation</th>
                    <th className={TH}>Points</th>
                  </tr>
                </thead>
                <tbody className={BODY}>
                  {a.movements.map((m) => (
                    <tr key={m.id}>
                      <td>{formatDateTime(m.createdAt)}</td>
                      <td><Link href={`/ventes/reservations/${m.bookingId}`} className="hover:underline">{m.bookingCode}</Link></td>
                      <td className="tabular-nums">+{m.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Panel>
          ))}
        </div>
      ),
    },
    {
      value: "parrainage", label: "Parrainage",
      content: (
        <div className="space-y-4">
          <Panel title="Parrainé par">
            {detail.sponsoredBy ? (
              <p className="flex gap-3 text-sm" data-testid="sponsored-by">
                <Gift size={22} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
                <span>
                Parrainé par <span className="font-medium">{detail.sponsoredBy.sponsorName}</span> avec le code{" "}
                {detail.sponsoredBy.code} ({detail.sponsoredBy.companyName}) le {formatDate(detail.sponsoredBy.at)}.</span>
              </p>
            ) : <Empty>Ce client n&apos;a pas été parrainé.</Empty>}
          </Panel>
          <Panel title={`Codes générés (${detail.sponsorships.length})`}>
            {detail.sponsorships.length === 0 ? <Empty>Aucun code de parrainage généré.</Empty> : (
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr>
                    <th className={TH}>Code</th>
                    <th className={TH}>Compagnie</th>
                    <th className={TH}>Récompense</th>
                    <th className={TH}>Statut</th>
                    <th className={TH}>Expire le</th>
                  </tr>
                </thead>
                <tbody className={BODY}>
                  {detail.sponsorships.map((x) => {
                    const badge = sponsorshipStatusBadge(x.status);
                    return (
                      <tr key={x.id} data-testid="sponsorship-row">
                        <td className="font-mono text-xs font-semibold">{x.code}</td>
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
          </Panel>
        </div>
      ),
    },
    {
      value: "reservations", label: "Réservations",
      content: (
        <Panel title={`Réservations (${detail.bookings.length})`}>
          {detail.bookings.length === 0 ? <Empty>Aucune réservation.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Code</th>
                  <th className={TH}>Trajet</th>
                  <th className={TH}>Montant</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Paiement</th>
                  <th className={TH}>Créée le</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.bookings.map((b) => {
                  const status = bookingStatusBadge(b.status);
                  const payment = bookingPaymentBadge(b.paymentStatus);
                  return (
                    <tr key={b.id}>
                      <td>
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
        </Panel>
      ),
    },
    {
      value: "avis", label: "Avis",
      content: (
        <Panel title={`Avis (${detail.feedbacks.length})`}>
          {detail.feedbacks.length === 0 ? <Empty>Aucun avis.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Titre</th>
                  <th className={TH}>Compagnie</th>
                  <th className={TH}>Type</th>
                  <th className={TH}>Note</th>
                  <th className={TH}>Statut</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.feedbacks.map((f) => {
                  const badge = feedbackStatusBadge(f.status);
                  return (
                    <tr key={f.id}>
                      <td>
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
        </Panel>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "profil";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
