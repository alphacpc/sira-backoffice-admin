import { Buildings, IdentificationCard } from "@phosphor-icons/react/dist/ssr";
import { LinkTabs } from "@/components/ui/link-tabs";
import { FilterSelect } from "@/components/data/filter-select";
import { PageHeader } from "@/components/data/page-header";
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

export function CompaniesHub({ view, statut }: { view: "all" | "kyc"; statut?: string }) {
  const kycView = view === "kyc";
  const kycQueue = companiesRepo.kycQueue();
  const status = FILTERS.some((f) => f.value === statut && f.value !== "all")
    ? (statut as CompanyStatus) : undefined;
  const companies = companiesRepo.listRows({ status });
  return (
    <>
      <PageHeader title="Compagnies" description="Les compagnies de transport clientes de la plateforme." />
      <LinkTabs
        label="Sections" active={kycView ? "kyc" : "all"}
        tabs={[
          { key: "all", label: "Toutes les compagnies", href: "/compagnies", count: companiesRepo.listRows({}).length, icon: Buildings },
          { key: "kyc", label: "File de revue KYC", href: "/compagnies/kyc", count: kycQueue.length, urgent: true, icon: IdentificationCard },
        ]}
      />
      {kycView ? (
        <>
          <KycBoard board={companiesRepo.kycBoard()} />
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
              count: companiesRepo.listRows(f.value === "all" ? {} : { status: f.value }).length,
            }))}
          />
        }
      />
      </>
      )}
    </>
  );
}
