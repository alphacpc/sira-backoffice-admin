import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { fleetsRepo, parseCompanyFilter } from "@/lib/repos/fleet";
import { FleetsTable } from "./fleets-table";

export const dynamic = "force-dynamic";

export default async function FleetsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Flottes" description="Les sous-flottes des compagnies, leur dépôt de base et leur nombre de bus." />
      <CompanyFilter basePath="/flotte/flottes" current={companyId} />
      <FleetsTable fleets={fleetsRepo.listRows({ companyId })} />
    </>
  );
}
