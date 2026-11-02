import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { PARCEL_STATUSES, parcelsRepo } from "@/lib/repos/parcels";
import { ParcelsTable } from "./parcels-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "IN_TRANSIT", label: "En transit" },
  { value: "AT_HUB", label: "Au hub" },
  { value: "DELIVERED", label: "Livrés" },
  { value: "CANCELLED", label: "Annulés" },
  { value: "RETURNED", label: "Retournés" },
  { value: "LOST", label: "Perdus" },
];

export default async function ParcelsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, PARCEL_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Colis"
        description="Colis confiés aux compagnies, du plus récent au plus ancien. Le téléphone du destinataire est masqué."
      />
      <CompanyFilter basePath="/colis" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/colis" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <ParcelsTable parcels={parcelsRepo.listRows({ companyId, status })} />
    </>
  );
}
