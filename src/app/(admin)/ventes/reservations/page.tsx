import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { BOOKING_CHANNELS, BOOKING_PAYMENT_STATUSES, BOOKING_STATUSES, bookingsRepo } from "@/lib/repos/sales";
import { BookingsTable } from "./bookings-table";

export const dynamic = "force-dynamic";

const BASE = "/ventes/reservations";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "confirmed", label: "Confirmées" },
  { value: "cancelled", label: "Annulées" },
];
const PAYMENT_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les paiements" },
  { value: "pending", label: "En attente" },
  { value: "paid", label: "Payées" },
  { value: "failed", label: "Échouées" },
];
const CHANNEL_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les canaux" },
  { value: "counter", label: "Guichet" },
  { value: "online", label: "En ligne" },
];

export default async function BookingsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string; paiement?: string; canal?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, BOOKING_STATUSES);
  const paymentStatus = parseFilter(sp.paiement, BOOKING_PAYMENT_STATUSES);
  const channel = parseFilter(sp.canal, BOOKING_CHANNELS);
  const keep = { compagnie: companyId, statut: status, paiement: paymentStatus, canal: channel };
  return (
    <>
      <PageHeader
        title="Réservations"
        description="Réservations des voyageurs de toutes les compagnies, de la plus récente à la plus ancienne."
      />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={PAYMENT_OPTIONS} current={paymentStatus} param="paiement" keep={keep} label="Filtrer par paiement" />
      <StatusFilterNav basePath={BASE} options={CHANNEL_OPTIONS} current={channel} param="canal" keep={keep} label="Filtrer par canal" />
      <BookingsTable bookings={bookingsRepo.listRows({ companyId, status, paymentStatus, channel })} />
    </>
  );
}
