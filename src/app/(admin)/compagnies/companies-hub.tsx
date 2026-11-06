import { Buildings, IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import { LinkTabs } from "@/components/ui/link-tabs";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
import { isLive } from "@/lib/api/config";
import { liveCompanies } from "@/lib/api/companies-live";
import { liveKycBoard } from "@/lib/api/kyc-live";
import { companiesRepo } from "@/lib/repos/companies";
import type { CompanyStatus } from "@/lib/types";
import { CompaniesTable } from "./companies-table";
import { KycBoard } from "@/components/company/kyc-board/kyc-board";

const FILTERS: { value: CompanyStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "draft", label: "Brouillon" },
  { value: "active", label: "Actives" },
  { value: "suspended", label: "Suspendues" },
  { value: "closed", label: "Fermées" },
];

export async function CompaniesHub({ view, statut }: { view: "all" | "kyc"; statut?: string }) {
  const kycView = view === "kyc";
  const status = FILTERS.some((f) => f.value === statut && f.value !== "all")
    ? (statut as CompanyStatus) : undefined;
  const live = isLive() ? await liveCompanies(status) : null;
  const kycCount = live ? live.kycPending : companiesRepo.kycQueue().length;
  const companies = live ? live.rows : companiesRepo.listRows({ status });
  const countOf = (f: CompanyStatus | "all"): number => live ? live.counts[f] : companiesRepo.listRows(f === "all" ? {} : { status: f }).length;
  return (
    <>
      <PageHeader title="Compagnies" description="Les compagnies de transport clientes de la plateforme." />
      <LinkTabs
        label="Sections" active={kycView ? "kyc" : "all"}
        tabs={[
          { key: "all", label: "Toutes les compagnies", href: "/compagnies", count: countOf("all"), icon: Buildings },
          { key: "kyc", label: "File de revue KYC", href: "/compagnies/kyc", count: kycCount, urgent: true, icon: IdentificationCard },
        ]}
      />
      {kycView ? (
        <>
          <KycBoard board={isLive() ? await liveKycBoard() : companiesRepo.kycBoard()} />
        </>
      ) : (
      <>
      <CompaniesTable
        companies={companies}
        toolbar={
          <FilterSelect
            label="Statut" param="statut" basePath="/compagnies" current={status ?? "all"}
            options={FILTERS.map((f) => ({
              value: f.value, label: f.label,
              count: countOf(f.value),
            }))}
          />
        }
      />
      </>
      )}
    </>
  );
}
