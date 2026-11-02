import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter, seatMapsRepo } from "@/lib/repos/fleet";
import { SeatMapsTable } from "./seat-maps-table";

export const dynamic = "force-dynamic";

export default async function SeatMapsPage({ searchParams }: { searchParams: Promise<{ compagnie?: string }> }) {
  const params = await searchParams;
  const companyId = parseCompanyFilter(params.compagnie);
  return (
    <>
      <PageHeader title="Plans de sièges" description="Un plan par trajet : sièges libres, réservés et occupés (un siège bloqué n'entre dans aucun des trois)." />
      <CompanyFilter basePath="/flotte/plans-de-sieges" current={companyId} />
      <SeatMapsTable seatMaps={seatMapsRepo.listRows({ companyId })} />
    </>
  );
}
