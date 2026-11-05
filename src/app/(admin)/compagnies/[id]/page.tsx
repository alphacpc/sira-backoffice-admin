import { notFound } from "next/navigation";
import { CompanyTabs } from "@/components/company/company-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { isBackofficeAdmin } from "@/lib/auth/session";
import { companyStatusBadge } from "@/lib/labels";
import { companiesRepo } from "@/lib/repos/companies";

export const dynamic = "force-dynamic";

export default async function CompanyPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = companiesRepo.detail(id);
  if (!detail) notFound();
  const canReplace = await isBackofficeAdmin();
  const badge = companyStatusBadge(detail.company.status);
  return (
    <>
      <PageHeader
        title={detail.company.name}
        description={`Identifiant : ${detail.company.slug}`}
        actions={<span data-testid="company-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>}
      />
      <CompanyTabs detail={detail} initialTab={onglet} canReplaceKycFile={canReplace} />
    </>
  );
}
