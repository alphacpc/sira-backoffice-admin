import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { maintenanceRepo, parseCompanyFilter } from "@/lib/repos/fleet";
import type { MaintenanceStatus } from "@/lib/types";
import { MaintenanceTable } from "./maintenance-table";

export const dynamic = "force-dynamic";

const STATUSES = ["PLANNED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const satisfies readonly MaintenanceStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "PLANNED", label: "Planifiées" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Terminées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default async function MaintenancePage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  const status = parseFilter(params.statut, STATUSES);
  return (
    <>
      <PageHeader title="Maintenance" description="Les interventions sur les bus ; le coût total est la main d'œuvre plus les pièces." />
      <CompanyFilter basePath="/flotte/maintenance" current={companyId} keep={{ statut: status }} />
      <StatusFilterNav basePath="/flotte/maintenance" options={STATUS_OPTIONS} current={status} keep={{ compagnie: companyId }} />
      <MaintenanceTable maintenances={maintenanceRepo.listRows({ companyId, status })} />
    </>
  );
}
