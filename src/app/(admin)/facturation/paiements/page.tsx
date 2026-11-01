import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { paymentsRepo } from "@/lib/repos/billing";
import { PaymentsTable } from "./payments-table";

export const dynamic = "force-dynamic";

const STATUSES = ["paid", "failed"] as const;
const OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "paid", label: "Payés" },
  { value: "failed", label: "Échoués" },
];

export default async function PaymentsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = parseFilter(statut, STATUSES);
  return (
    <>
      <PageHeader
        title="Paiements"
        description="Tentatives de paiement des abonnements, de la plus récente à la plus ancienne."
      />
      <StatusFilterNav basePath="/facturation/paiements" options={OPTIONS} current={status} />
      <PaymentsTable payments={paymentsRepo.listRows({ status })} />
    </>
  );
}
