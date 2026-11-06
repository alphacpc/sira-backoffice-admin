import { Buildings, CalendarCheck, ShieldCheck, User, UserCheck } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { DsrActions } from "@/components/compliance/dsr-actions";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDate, formatDateTime } from "@/lib/format";
import { dsrStatusBadge, dsrTypeLabel } from "@/lib/labels";
import { isLive } from "@/lib/api/config";
import { liveDsrDetail } from "@/lib/api/comp-live";
import { dsrRepo } from "@/lib/repos/compliance";

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

export default async function DataSubjectRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = isLive() ? await liveDsrDetail(id, new Date()) : dsrRepo.detail(id, new Date());
  if (!detail) notFound();
  const { request: r } = detail;
  const status = dsrStatusBadge(r.status);
  const open = r.status === "RECEIVED" || r.status === "IN_PROGRESS";
  return (
    <>
      <PageHeader
        title={`${dsrTypeLabel(r.requestType)} · ${detail.requesterName}`}
        description={`Demande reçue le ${formatDate(r.createdAt)}`}
        actions={
          <>
            <span data-testid="dsr-status"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></span>
            {open && <DsrActions requestId={r.id} status={r.status as "RECEIVED" | "IN_PROGRESS"} />}
          </>
        }
      />
      {!open && (
        <p data-testid="dsr-closed-note" className="mb-4 text-sm text-muted-foreground">
          Cette demande est close : elle ne peut plus être modifiée.
        </p>
      )}
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <ShieldCheck size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{dsrTypeLabel(r.requestType)}</p>
            <p className="text-sm text-muted-foreground">{detail.requesterName} · reçue le {formatDate(r.createdAt)}</p>
          </div>
          <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
          <div className={`text-right ${detail.overdue ? "text-danger" : ""}`}>
            <p className="text-2xl font-bold tabular-nums" data-testid="dsr-countdown">
              {detail.daysLeft === null ? "—" : detail.overdue ? `En retard de ${-detail.daysLeft} j` : `${detail.daysLeft} j restants`}
            </p>
            <p className="text-sm text-muted-foreground">Échéance légale : {formatDate(r.dueDate)}</p>
          </div>
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          <Section title="Motif du demandeur">
            <blockquote className="border-l-2 border-orange-500 pl-4 text-sm leading-relaxed">{r.reason}</blockquote>
          </Section>
          <Section title="Notes de résolution">
            {r.resolutionNotes
              ? <blockquote data-testid="dsr-resolution" className="border-l-2 border-border pl-4 text-sm leading-relaxed">{r.resolutionNotes}</blockquote>
              : <p className="text-sm text-muted-foreground">Aucune note pour le moment.</p>}
          </Section>
        </div>

        <Section title="Détails">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Info icon={User} label="Demandeur"><Link href={`/utilisateurs/${detail.requesterUserId}`} className="hover:underline">{detail.requesterName}</Link></Info>
            <Info icon={Buildings} label="Compagnie">
              {r.companyId ? <Link href={`/compagnies/${r.companyId}`} className="hover:underline">{detail.companyName}</Link> : "Niveau plateforme"}
            </Info>
            <Info icon={UserCheck} label="Traitée par">{r.handledBy ?? "—"}</Info>
            <Info icon={CalendarCheck} label="Résolue le">{r.resolvedAt ? formatDateTime(r.resolvedAt) : "—"}</Info>
          </div>
        </Section>
      </div>
    </>
  );
}
