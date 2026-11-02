import { notFound } from "next/navigation";
import { CampaignTabs } from "@/components/communication/campaign-tabs";
import { CancelCampaignButton } from "@/components/communication/cancel-campaign-button";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { campaignStatusBadge } from "@/lib/labels";
import { campaignsRepo } from "@/lib/repos/communication";

export const dynamic = "force-dynamic";

export default async function CampaignPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = campaignsRepo.detail(id);
  if (!detail) notFound();
  const { campaign } = detail;
  const status = campaignStatusBadge(campaign.status);
  return (
    <>
      <PageHeader
        title={campaign.name}
        description={detail.companyName}
        actions={
          <>
            <span data-testid="campaign-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {campaign.status !== "CANCELLED" && <CancelCampaignButton campaignId={campaign.id} name={campaign.name} />}
          </>
        }
      />
      {campaign.status !== "CANCELLED" && detail.cancelBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="cancel-blocked">
          Annulation impossible : {detail.cancelBlockedReason}.
        </p>
      )}
      <CampaignTabs detail={detail} initialTab={onglet} />
    </>
  );
}
