import Link from "next/link";
import { PageHeader } from "@/components/data/page-header";
import { companiesRepo } from "@/lib/repos/companies";
import type { CompanyStatus } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CompaniesTable } from "./companies-table";

export const dynamic = "force-dynamic";

const FILTERS: { value: CompanyStatus | "all"; label: string }[] = [
  { value: "all", label: "Toutes" },
  { value: "draft", label: "Brouillon" },
  { value: "active", label: "Actives" },
  { value: "suspended", label: "Suspendues" },
  { value: "closed", label: "Fermées" },
];

export default async function CompagniesPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = FILTERS.some((f) => f.value === statut && f.value !== "all")
    ? (statut as CompanyStatus) : undefined;
  const companies = companiesRepo.listRows({ status });
  return (
    <>
      <PageHeader title="Compagnies" description="Les compagnies de transport clientes de la plateforme." />
      <nav aria-label="Filtrer par statut" className="mb-4 flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = (f.value === "all" && !status) || f.value === status;
          return (
            <Link
              key={f.value}
              href={f.value === "all" ? "/compagnies" : `/compagnies?statut=${f.value}`}
              aria-current={active ? "page" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-sm",
                active ? "border-accent bg-accent-soft font-medium" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {f.label}
            </Link>
          );
        })}
      </nav>
      <CompaniesTable companies={companies} />
    </>
  );
}
