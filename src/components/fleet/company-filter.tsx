import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { fleetCompanies } from "@/lib/repos/fleet";

/** Server Component: `?compagnie=` pills over the companies that own a fleet; keeps the other filters. */
export function CompanyFilter({
  basePath, current, keep,
}: { basePath: string; current: string | undefined; keep?: Record<string, string | undefined> }) {
  const options: FilterOption[] = [
    { value: "all", label: "Toutes les compagnies" },
    ...fleetCompanies().map((c) => ({ value: c.id, label: c.name })),
  ];
  return (
    <StatusFilterNav
      basePath={basePath} options={options} current={current} param="compagnie" label="Filtrer par compagnie" keep={keep}
    />
  );
}
