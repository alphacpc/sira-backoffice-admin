import { notFound } from "next/navigation";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { BusTabs } from "@/components/fleet/bus-tabs";
import { RetireBusButton } from "@/components/fleet/retire-bus-button";
import { busStatusBadge } from "@/lib/labels";
import { busesRepo } from "@/lib/repos/fleet";

export const dynamic = "force-dynamic";

export default async function BusPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = busesRepo.detail(id);
  if (!detail) notFound();
  const { bus } = detail;
  const badge = busStatusBadge(bus.status);
  return (
    <>
      <PageHeader
        title={bus.plate}
        description={`${bus.busCode} · ${bus.brand} ${bus.model} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="bus-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
            {bus.status !== "retired" && <RetireBusButton busId={bus.id} plate={bus.plate} />}
          </>
        }
      />
      <BusTabs detail={detail} initialTab={onglet} />
    </>
  );
}
