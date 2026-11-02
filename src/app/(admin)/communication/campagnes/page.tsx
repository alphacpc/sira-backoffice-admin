import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { CAMPAIGN_STATUSES, campaignsRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { CampaignsTable } from "./campaigns-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "SCHEDULED", label: "Programmées" },
  { value: "RUNNING", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default async function CampaignsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, CAMPAIGN_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader title="Campagnes" description="Campagnes marketing des compagnies, de la plus récente à la plus ancienne." />
      <CompanyFilter basePath="/communication/campagnes" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/communication/campagnes" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <CampaignsTable campaigns={campaignsRepo.listRows({ companyId, status })} />
    </>
  );
}
