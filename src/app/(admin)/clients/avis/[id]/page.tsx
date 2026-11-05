import { Buildings, ChatCircleText, MapPin, Package, Ticket, User } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { IgnoreFeedbackButton } from "@/components/clients/ignore-feedback-button";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { feedbackStatusBadge, feedbackTypeLabel, ratingStars } from "@/lib/labels";
import { feedbackRepo } from "@/lib/repos/clients";

export const dynamic = "force-dynamic";

type IconType = ComponentType<{ size?: number; weight?: "duotone"; "aria-hidden"?: boolean; className?: string }>;

function Info({ icon: Icon, label, children }: { icon: IconType; label: string; children: ReactNode }) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border p-4">
      <Icon size={24} weight="duotone" aria-hidden className="mt-0.5 shrink-0 text-orange-500" />
      <div className="min-w-0">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 text-sm font-semibold">{children}</div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

export default async function FeedbackDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = feedbackRepo.detail(id);
  if (!detail) notFound();
  const { feedback: f } = detail;
  const status = feedbackStatusBadge(f.status);
  const canIgnore = f.status === "PENDING" || f.status === "REVIEWED";
  return (
    <>
      <PageHeader
        title={f.title}
        description={`${detail.customerName} · ${detail.companyName}`}
        actions={
          <>
            <span data-testid="feedback-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {canIgnore && <IgnoreFeedbackButton feedbackId={f.id} title={f.title} />}
          </>
        }
      />
      {!canIgnore && detail.ignoreBlockedReason && (
        <p className="mb-4 text-sm text-muted-foreground" data-testid="ignore-blocked">
          Modération impossible : {detail.ignoreBlockedReason}.
        </p>
      )}
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <ChatCircleText size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{f.title}</p>
            <p className="text-sm text-muted-foreground">{feedbackTypeLabel(f.feedbackType)} · {formatDateTime(f.createdAt)}</p>
          </div>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <p className="text-2xl tracking-wider text-orange-500" aria-label={`Note ${f.rating} sur 5`}>{ratingStars(f.rating)}</p>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Commentaire du client">
            <blockquote className="border-l-2 border-orange-500 pl-4 text-sm leading-relaxed">{f.comment}</blockquote>
          </Section>
          <Section title="Réponse de la compagnie">
            {f.response ? (
              <>
                <blockquote className="border-l-2 border-border pl-4 text-sm leading-relaxed">{f.response}</blockquote>
                {f.respondedAt && <p className="mt-3 text-xs text-muted-foreground">Répondu le {formatDateTime(f.respondedAt)}</p>}
              </>
            ) : <p className="text-sm text-muted-foreground">Aucune réponse.</p>}
          </Section>
        </div>

        <Section title="Contexte">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={User} label="Client"><Link href={`/clients/comptes/${f.customerId}`} className="hover:underline">{detail.customerName}</Link></Info>
            <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${f.companyId}`} className="hover:underline">{detail.companyName}</Link></Info>
            <Info icon={MapPin} label="Trajet">
              {f.tripId && detail.tripLabel ? <Link href={`/flotte/trajets/${f.tripId}`} className="hover:underline">{detail.tripLabel}</Link> : "—"}
            </Info>
            <Info icon={Ticket} label="Réservation">
              {f.bookingId && detail.bookingCode ? <Link href={`/ventes/reservations/${f.bookingId}`} className="hover:underline">{detail.bookingCode}</Link> : "—"}
            </Info>
            <Info icon={Package} label="Colis">
              {f.parcelId && detail.parcelCode ? <Link href={`/colis/${f.parcelId}`} className="hover:underline">{detail.parcelCode}</Link> : "—"}
            </Info>
          </div>
        </Section>
      </div>
    </>
  );
}
