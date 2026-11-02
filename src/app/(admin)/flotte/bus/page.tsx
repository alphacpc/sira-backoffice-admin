import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { busesRepo, parseCompanyFilter } from "@/lib/repos/fleet";
import type { BusStatus } from "@/lib/types";
import { BusesTable } from "./buses-table";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "maintenance", "retired"] as const satisfies readonly BusStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "En service" },
  { value: "maintenance", label: "En maintenance" },
  { value: "retired", label: "Hors service" },
];
const DRIVER_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les bus" },
  { value: "sans", label: "Sans conducteur affecté" },
];

export default async function BusesPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string; conducteur?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  const status = parseFilter(params.statut, STATUSES);
  const driver = parseFilter(params.conducteur, ["sans"] as const);
  return (
    <>
      <PageHeader title="Bus" description="Les bus de toutes les compagnies : caractéristiques, équipage et maintenance. Lecture seule, sauf la mise hors service." />
      <CompanyFilter basePath="/flotte/bus" current={companyId} keep={{ statut: status, conducteur: driver }} />
      <StatusFilterNav basePath="/flotte/bus" options={STATUS_OPTIONS} current={status} keep={{ compagnie: companyId, conducteur: driver }} />
      <StatusFilterNav
        basePath="/flotte/bus" options={DRIVER_OPTIONS} current={driver} param="conducteur"
        label="Filtrer par conducteur" keep={{ compagnie: companyId, statut: status }}
      />
      <BusesTable buses={busesRepo.listRows({ companyId, status, withoutDriver: driver === "sans" })} />
    </>
  );
}
