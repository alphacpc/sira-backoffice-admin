import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter, tripsRepo } from "@/lib/repos/fleet";
import type { TripStatus } from "@/lib/types";
import { TripsTable } from "./trips-table";

export const dynamic = "force-dynamic";

const STATUSES = ["planned", "boarding", "departed", "cancelled"] as const satisfies readonly TripStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "planned", label: "Planifiés" },
  { value: "boarding", label: "En embarquement" },
  { value: "departed", label: "Partis" },
  { value: "cancelled", label: "Annulés" },
];

export default async function TripsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  const status = parseFilter(params.statut, STATUSES);
  return (
    <>
      <PageHeader title="Trajets" description="Les trajets de toutes les compagnies, du plus récent au plus ancien." />
      <CompanyFilter basePath="/flotte/trajets" current={companyId} keep={{ statut: status }} />
      <StatusFilterNav basePath="/flotte/trajets" options={STATUS_OPTIONS} current={status} keep={{ compagnie: companyId }} />
      <TripsTable trips={tripsRepo.listRows({ companyId, status })} />
    </>
  );
}
