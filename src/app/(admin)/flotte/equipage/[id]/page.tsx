import { Buildings, Bus, IdentificationCard, QrCode } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ComponentType, ReactNode } from "react";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { formatDateTime } from "@/lib/format";
import { crewRoleLabel, tripStatusBadge } from "@/lib/labels";
import { crewRepo } from "@/lib/repos/fleet";

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

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";
const Empty = ({ children }: { children: ReactNode }) => <p className="text-sm text-muted-foreground">{children}</p>;

export default async function CrewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = crewRepo.detail(id);
  if (!detail) notFound();
  const { member } = detail;
  const isController = member.role === "CONTROLLER";
  return (
    <>
      <PageHeader title={member.name} description={`${crewRoleLabel(member.role)} · ${detail.companyName}`} />
      <div className="space-y-5">
        <section className="flex flex-wrap items-center gap-4 rounded-card border border-border bg-card p-6 shadow-card">
          <IdentificationCard size={40} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
          <div className="min-w-0 flex-1">
            <p className="text-lg font-bold">{member.name}</p>
            <p className="text-sm text-muted-foreground">{crewRoleLabel(member.role)}</p>
          </div>
          <StatusBadge tone="info">Registre d&apos;équipage</StatusBadge>
        </section>

        <div className="grid gap-3 sm:grid-cols-3">
          <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${detail.companyId}?onglet=equipe`} className="hover:underline">{detail.companyName}</Link></Info>
          <Info icon={Bus} label="Bus affectés">{detail.buses.length}</Info>
          <Info icon={QrCode} label="Billets contrôlés">{isController ? detail.scans.length : "—"}</Info>
        </div>

        <Section title={`Bus affectés (${detail.buses.length})`}>
          {detail.buses.length === 0 ? <Empty>Aucun bus affecté.</Empty> : (
            <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {detail.buses.map((b) => (
                <li key={b.id}>
                  <Link href={`/flotte/bus/${b.id}`} className="flex items-center gap-3 rounded-xl border border-border p-3 transition hover:bg-muted">
                    <Bus size={22} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
                    <span className="flex-1 font-mono text-sm font-semibold">{b.plate}</span>
                    <span className="font-mono text-xs text-muted-foreground">{b.busCode}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title={`Trajets (${detail.trips.length})`}>
          {detail.trips.length === 0 ? <Empty>Aucun trajet.</Empty> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr><th className={TH}>Départ</th><th className={TH}>Ligne</th><th className={`${TH} text-right`}>Statut</th></tr></thead>
                <tbody className={BODY}>
                  {detail.trips.map((t) => { const s = tripStatusBadge(t.status); return (
                    <tr key={t.id}>
                      <td><Link href={`/flotte/trajets/${t.id}`} className="font-medium hover:underline">{formatDateTime(t.departure)}</Link></td>
                      <td>{t.routeLabel}</td>
                      <td className="text-right"><StatusBadge tone={s.tone}>{s.label}</StatusBadge></td>
                    </tr>
                  ); })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {isController && (
          <Section title={`Billets contrôlés (${detail.scans.length})`}>
            {detail.scans.length === 0 ? <Empty>Aucun contrôle enregistré.</Empty> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b border-border"><tr><th className={TH}>Contrôlé le</th><th className={TH}>Billet</th><th className={TH}>Passager</th><th className={TH}>Trajet</th></tr></thead>
                  <tbody className={BODY}>
                    {detail.scans.map((x) => (
                      <tr key={`${x.ticketCode}${x.at}`}>
                        <td className="whitespace-nowrap">{formatDateTime(x.at)}</td>
                        <td><Link href={`/ventes/billets/${x.ticketCode}`} className="font-mono text-xs font-semibold hover:underline">{x.ticketCode}</Link></td>
                        <td>{x.passengerName}</td>
                        <td><Link href={`/flotte/trajets/${x.tripId}`} className="hover:underline">{x.routeLabel}</Link></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Section>
        )}
      </div>
    </>
  );
}
