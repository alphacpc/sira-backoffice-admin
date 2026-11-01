import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { invoicesRepo } from "@/lib/repos/billing";
import { InvoicesTable } from "./invoices-table";

export const dynamic = "force-dynamic";

const STATUSES = ["paid", "failed"] as const;
const OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "paid", label: "Payées" },
  { value: "failed", label: "Échouées" },
];

export default async function InvoicesPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = parseFilter(statut, STATUSES);
  return (
    <>
      <PageHeader title="Factures" description="Factures d'abonnement émises par Sira aux compagnies." />
      <StatusFilterNav basePath="/facturation/factures" options={OPTIONS} current={status} />
      <InvoicesTable invoices={invoicesRepo.listRows({ status })} />
    </>
  );
}
