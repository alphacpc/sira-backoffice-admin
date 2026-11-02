import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { MESSAGE_STATUSES, messagesRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { MessagesTable } from "./messages-table";

export const dynamic = "force-dynamic";

const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "DRAFT", label: "Brouillons" },
  { value: "APPROVED", label: "Approuvés" },
  { value: "SENT", label: "Envoyés" },
];

export default async function MessagesPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const status = parseFilter(sp.statut, MESSAGE_STATUSES);
  const keep = { compagnie: companyId, statut: status };
  return (
    <>
      <PageHeader
        title="Messages"
        description="Messages marketing rédigés par les compagnies. Seul le canal « dans l'application » est réellement envoyé."
      />
      <CompanyFilter basePath="/communication/messages" current={companyId} keep={keep} />
      <StatusFilterNav basePath="/communication/messages" options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <MessagesTable messages={messagesRepo.listRows({ companyId, status })} />
    </>
  );
}
