import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, vendorsRepo } from "@/lib/repos/fleet";
import { VendorsTable } from "./vendors-table";

export const dynamic = "force-dynamic";

export default async function VendorsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader
        title="Fournisseurs"
        description="Garages, assureurs et fournisseurs de pièces des compagnies. Interventions hors annulées ; coût cumulé des interventions terminées."
      />
      <CompanyFilter basePath="/flotte/fournisseurs" current={companyId} />
      <VendorsTable vendors={vendorsRepo.listRows({ companyId })} />
    </>
  );
}
