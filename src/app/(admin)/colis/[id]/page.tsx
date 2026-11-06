import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { DeclareLostButton } from "@/components/parcels/declare-lost-button";
import { ParcelTabs } from "@/components/parcels/parcel-tabs";
import { parcelStatusBadge } from "@/lib/labels";
import { CLOSED_PARCEL_STATUSES, parcelsRepo } from "@/lib/repos/parcels";

export const dynamic = "force-dynamic";

export default async function ParcelPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  // Detail pages are not wired to the platform yet: never read the demonstration store in live mode.
  if (isLive()) notFound();
  const detail = parcelsRepo.detail(id);
  if (!detail) notFound();
  const { parcel } = detail;
  const status = parcelStatusBadge(parcel.status);
  return (
    <>
      <PageHeader
        title={`Colis ${parcel.parcelCode}`}
        description={`${detail.routeLabel} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="parcel-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {!CLOSED_PARCEL_STATUSES.includes(parcel.status) && (
              <DeclareLostButton parcelId={parcel.id} parcelCode={parcel.parcelCode} />
            )}
          </>
        }
      />
      {!CLOSED_PARCEL_STATUSES.includes(parcel.status) && detail.lostBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="lost-blocked">
          Déclaration de perte impossible : {detail.lostBlockedReason}.
        </p>
      )}
      <ParcelTabs detail={detail} initialTab={onglet} />
    </>
  );
}
