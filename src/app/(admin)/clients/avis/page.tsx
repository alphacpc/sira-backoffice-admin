import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { FEEDBACK_STATUSES, feedbackRepo } from "@/lib/repos/clients";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { FeedbackTable } from "./feedback-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "PENDING", label: "En attente" },
  { value: "REVIEWED", label: "Examinés" },
  { value: "RESOLVED", label: "Résolus" },
  { value: "IGNORED", label: "Ignorés" },
];

export default async function FeedbackPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, FEEDBACK_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Avis"
        description="Avis des voyageurs sur les trajets, les colis et le service, du plus récent au plus ancien."
      />
      <CompanyFilter basePath="/clients/avis" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/clients/avis" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <FeedbackTable feedbacks={feedbackRepo.listRows({ companyId, status })} />
    </>
  );
}
