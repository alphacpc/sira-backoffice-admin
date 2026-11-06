import { notFound } from "next/navigation";
import { CompanyTabs } from "@/components/company/company-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { liveCompanyDetail } from "@/lib/api/company-detail-live";
import { isLive } from "@/lib/api/config";
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
  const detail = isLive() ? await liveCompanyDetail(id) : companiesRepo.detail(id);
  if (!detail) notFound();
  // File replacement stays off in live mode (not wired to the platform).
  const canReplace = !isLive() && (await isBackofficeAdmin());
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
