import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, stationsRepo } from "@/lib/repos/fleet";
import { StationsTable } from "./stations-table";

export const dynamic = "force-dynamic";

export default async function StationsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Gares" description="Les gares des compagnies et le nombre de lignes qui les desservent." />
      <CompanyFilter basePath="/flotte/gares" current={companyId} />
      <StationsTable stations={stationsRepo.listRows({ companyId })} />
    </>
  );
}
