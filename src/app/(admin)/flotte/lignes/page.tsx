import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, routesRepo } from "@/lib/repos/fleet";
import { RoutesTable } from "./routes-table";

export const dynamic = "force-dynamic";

export default async function RoutesPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Lignes" description="Les lignes des compagnies (origine → destination), avec leurs bus et leurs trajets." />
      <CompanyFilter basePath="/flotte/lignes" current={companyId} />
      <RoutesTable routes={routesRepo.listRows({ companyId })} />
    </>
  );
}
