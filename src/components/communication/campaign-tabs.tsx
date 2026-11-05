import { Buildings, CalendarBlank, Megaphone, Target, User, Wallet } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";
import type { ComponentType, ReactNode } from "react";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  campaignStatusBadge, messageStatusBadge, notificationChannelLabel, objectiveLabel, scheduleStatusBadge,
} from "@/lib/labels";
import type { CampaignDetail } from "@/lib/repos/communication";

const TAB_VALUES = ["resume", "segments", "messages", "programmations"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

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

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-card p-6 shadow-card">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </section>
  );
}

const TH = "py-2 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground";
const BODY = "[&_td]:py-2.5 [&_tr]:border-b [&_tr]:border-border [&_tr:last-child]:border-0";

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function CampaignTabs({ detail, initialTab }: { detail: CampaignDetail; initialTab?: string }) {
  const { campaign: c } = detail;
  const status = campaignStatusBadge(c.status);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Panel title="Vue d'ensemble">
          <div className="flex flex-wrap items-center gap-4 rounded-xl bg-muted/50 p-5">
            <Megaphone size={36} weight="duotone" aria-hidden className="shrink-0 text-orange-500" />
            <div className="min-w-0 flex-1">
              <p className="text-lg font-bold">{c.name}</p>
              <p className="text-sm text-muted-foreground">{objectiveLabel(c.objective)}</p>
            </div>
            <StatusBadge tone={status.tone}>{status.label}</StatusBadge>
            <p className="text-3xl font-bold tabular-nums">{formatMoney(c.budget, c.currency)}</p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Info icon={Buildings} label="Compagnie"><Link href={`/compagnies/${c.companyId}`} className="hover:underline">{detail.companyName}</Link></Info>
            <Info icon={Target} label="Objectif">{objectiveLabel(c.objective)}</Info>
            <Info icon={Wallet} label="Budget">{formatMoney(c.budget, c.currency)}</Info>
            <Info icon={CalendarBlank} label="Début">{formatDate(c.startDate)}</Info>
            <Info icon={CalendarBlank} label="Fin">{formatDate(c.endDate)}</Info>
            <Info icon={User} label="Créée par">{detail.createdByName}</Info>
            <Info icon={CalendarBlank} label="Créée le">{formatDate(c.createdAt)}</Info>
            <Info icon={CalendarBlank} label="Modifiée le">{c.updatedAt ? formatDateTime(c.updatedAt) : "—"}</Info>
          </div>
        </Panel>
      ),
    },
    {
      value: "segments", label: "Segments",
      content: (
        <Panel title={`Segments (${detail.segments.length})`}>
          {detail.segments.length === 0 ? <Empty>Aucun segment propre à cette campagne.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Nom</th>
                  <th className={TH}>Ciblage</th>
                  <th className={TH}>Taille estimée</th>
                  <th className={TH}>Éligibles aujourd&apos;hui</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.segments.map((s) => (
                  <tr key={s.id}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.criteriaLabel}</td>
                    <td className="tabular-nums">{s.estimatedSize}</td>
                    <td className="tabular-nums">{s.eligibleNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
      ),
    },
    {
      value: "messages", label: "Messages",
      content: (
        <Panel title={`Messages (${detail.messages.length})`}>
          {detail.messages.length === 0 ? <Empty>Aucun message.</Empty> : (
            <ul className="grid gap-3 lg:grid-cols-2">
              {detail.messages.map((m) => {
                const badge = messageStatusBadge(m.status);
                return (
                  <li key={m.id} className="rounded-xl border border-border p-4">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="flex-1 text-sm font-semibold">{m.subject}</span>
                      <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                      <span className="text-xs text-muted-foreground">{notificationChannelLabel(m.channel)}</span>
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">{m.content}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      ),
    },
    {
      value: "programmations", label: "Programmations",
      content: (
        <Panel title={`Programmations (${detail.schedules.length})`}>
          {detail.schedules.length === 0 ? <Empty>Aucune programmation.</Empty> : (
            <table className="w-full text-sm">
              <thead className="border-b border-border">
                <tr>
                  <th className={TH}>Prévue le</th>
                  <th className={TH}>Message</th>
                  <th className={TH}>Segment</th>
                  <th className={TH}>Statut</th>
                  <th className={TH}>Destinataires</th>
                  <th className={TH}>Envoyée le</th>
                </tr>
              </thead>
              <tbody className={BODY}>
                {detail.schedules.map((x) => {
                  const badge = scheduleStatusBadge(x.status);
                  return (
                    <tr key={x.id}>
                      <td>{formatDateTime(x.scheduledAt)}</td>
                      <td>{x.messageSubject}</td>
                      <td>{x.segmentName}</td>
                      <td><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></td>
                      <td className="tabular-nums">{x.recipientsCount}</td>
                      <td>{x.sentAt ? formatDateTime(x.sentAt) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </Panel>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
