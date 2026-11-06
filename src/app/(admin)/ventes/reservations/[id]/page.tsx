import { notFound } from "next/navigation";
import { isLive } from "@/lib/api/config";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { BookingTabs } from "@/components/sales/booking-tabs";
import { CancelBookingButton } from "@/components/sales/cancel-booking-button";
import { bookingPaymentBadge, bookingStatusBadge } from "@/lib/labels";
import { liveBookingDetail } from "@/lib/api/sales-detail-live";
import { bookingsRepo } from "@/lib/repos/sales";

export const dynamic = "force-dynamic";

export default async function BookingPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = isLive() ? await liveBookingDetail(id) : bookingsRepo.detail(id, new Date());
  if (!detail) notFound();
  const { booking } = detail;
  const status = bookingStatusBadge(booking.status);
  const payment = bookingPaymentBadge(booking.paymentStatus);
  return (
    <>
      <PageHeader
        title={`Réservation ${booking.bookingCode}`}
        description={`${booking.passengerName} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="booking-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            <span data-testid="booking-payment"><StatusBadge tone={payment.tone}>{payment.label}</StatusBadge></span>
            {booking.status === "confirmed" && (
              <CancelBookingButton bookingId={booking.id} bookingCode={booking.bookingCode} />
            )}
          </>
        }
      />
      {booking.status === "confirmed" && detail.cancelBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="cancel-blocked">
          Annulation impossible : {detail.cancelBlockedReason}.
        </p>
      )}
      <BookingTabs detail={detail} initialTab={onglet} />
    </>
  );
}
