import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { SCHEDULE_STATUSES, schedulesRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { SchedulesTable } from "./schedules-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "SENT", label: "Envoyées" },
  { value: "FAILED", label: "Échouées" },
  { value: "CANCELLED", label: "Annulées" },
];

export default async function SchedulesPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, SCHEDULE_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Programmations"
        description="Envois planifiés des campagnes. Une programmation en attente part automatiquement à l'échéance."
      />
      <CompanyFilter basePath="/communication/programmations" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/communication/programmations" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <SchedulesTable schedules={schedulesRepo.listRows({ companyId, status })} />
    </>
  );
}
