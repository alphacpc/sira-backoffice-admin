import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { segmentsRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { SegmentsTable } from "./segments-table";

export const dynamic = "force-dynamic";

export default async function SegmentsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string }> }) {
  const { compagnie } = await searchParams;
  const companyId = parseCompanyFilter(compagnie);
  return (
    <>
      <PageHeader
        title="Segments"
        description="Ciblages des campagnes. Seul le palier de fidélité est évalué ; les destinataires éligibles sont recalculés à chaque lecture."
      />
      <CompanyFilter basePath="/communication/segments" current={companyId} />
      <SegmentsTable segments={segmentsRepo.listRows({ companyId })} />
    </>
  );
}
