import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { TRANSACTION_STATUSES, transactionsRepo } from "@/lib/repos/sales";
import { TransactionsTable } from "./transactions-table";

export const dynamic = "force-dynamic";

const BASE = "/ventes/paiements";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "COMPLETED", label: "Réussis" },
  { value: "FAILED", label: "Échoués" },
];
const ANOMALY_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "oui", label: "Avec incohérence" },
];

export default async function TravellerPaymentsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string; anomalie?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, TRANSACTION_STATUSES);
  const anomaly = parseFilter(sp.anomalie, ["oui"] as const);
  const keep = { compagnie: companyId, statut: status, anomalie: anomaly };
  return (
    <>
      <PageHeader
        title="Paiements des voyageurs"
        description="Transactions en ligne et au guichet, avec les incohérences détectées (paiement bloqué, montant différent, billet manquant)."
      />
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={ANOMALY_OPTIONS} current={anomaly} param="anomalie" keep={keep} label="Filtrer par incohérence" />
      <TransactionsTable
        transactions={transactionsRepo.listRows({ companyId, status, anomalyOnly: anomaly === "oui" }, new Date())}
      />
    </>
  );
}
