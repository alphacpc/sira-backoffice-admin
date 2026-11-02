import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { formatNumber } from "@/lib/format";
import { loyaltyRepo } from "@/lib/repos/clients";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { ProgramsTable } from "./programs-table";

export const dynamic = "force-dynamic";

export default async function LoyaltyPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string }> }) {
  const { compagnie } = await searchParams;
  const companyId = parseCompanyFilter(compagnie);
  const programs = loyaltyRepo.listPrograms({ companyId });
  return (
    <>
      <PageHeader
        title="Fidélité"
        description="Programmes de fidélité des compagnies. Les points sont crédités à chaque réservation en ligne payée ; la dépense de points n'existe pas encore."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <KpiCard label="Programmes actifs" value={programs.filter((p) => p.status === "ACTIVE").length} hint={`${programs.length} au total`} />
        <KpiCard label="Comptes de fidélité" value={formatNumber(programs.reduce((n, p) => n + p.accounts, 0))} />
        <KpiCard label="Points distribués" value={formatNumber(programs.reduce((n, p) => n + p.pointsIssued, 0))} />
      </div>
      <CompanyFilter basePath="/clients/fidelite" current={companyId} />
      <ProgramsTable programs={programs} />
    </>
  );
}
