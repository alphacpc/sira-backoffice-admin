import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { TICKET_STATUSES, ticketsRepo } from "@/lib/repos/sales";
import { TicketsTable } from "./tickets-table";

export const dynamic = "force-dynamic";

const BASE = "/ventes/billets";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "ISSUED", label: "Émis" },
  { value: "CHECKED_IN", label: "Enregistrés" },
  { value: "USED", label: "Utilisés" },
  { value: "CANCELLED", label: "Annulés" },
];

export default async function TicketsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, TICKET_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader title="Billets" description="Billets émis aux voyageurs, du plus récent au plus ancien." />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <TicketsTable tickets={ticketsRepo.listRows({ companyId, status })} />
    </>
  );
}
