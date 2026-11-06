import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { liveSubscriptionDetail } from "@/lib/api/billing-live";
import { SubscriptionActions } from "@/components/billing/subscription-actions";
import { SubscriptionTabs } from "@/components/billing/subscription-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { billingCycleLabel, subscriptionStatusBadge } from "@/lib/labels";
import { subscriptionsRepo } from "@/lib/repos/billing";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = isLive() ? await liveSubscriptionDetail(id) : subscriptionsRepo.detail(id);
  if (!detail) notFound();
  const sub = detail.subscription;
  const badge = subscriptionStatusBadge(sub.status);
  return (
    <>
      <PageHeader
        title={`Abonnement de ${detail.companyName}`}
        description={`Plan ${sub.planName} · ${billingCycleLabel(sub.billingCycle)}`}
        actions={
          <>
            <span data-testid="subscription-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
            <SubscriptionActions
              subscriptionId={sub.id} companyName={detail.companyName}
              canRetry={detail.canRetry} canCancel={detail.canCancel}
            />
          </>
        }
      />
      <SubscriptionTabs detail={detail} initialTab={onglet} />
    </>
  );
}
