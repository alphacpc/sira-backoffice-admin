import Link from "next/link";
import { DetailRow } from "@/components/data/detail-row";
import { StatusBadge } from "@/components/data/status-badge";
import { TabsWithUrl } from "@/components/data/tabs-with-url";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import {
  campaignStatusBadge, messageStatusBadge, notificationChannelLabel, objectiveLabel, scheduleStatusBadge,
} from "@/lib/labels";
import type { CampaignDetail } from "@/lib/repos/communication";

const TAB_VALUES = ["resume", "segments", "messages", "programmations"];

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-muted-foreground">{children}</p>;
}

/** Server Component: tab contents are rendered here; only rendered nodes reach TabsWithUrl. */
export function CampaignTabs({ detail, initialTab }: { detail: CampaignDetail; initialTab?: string }) {
  const { campaign: c } = detail;
  const status = campaignStatusBadge(c.status);

  const items = [
    {
      value: "resume", label: "Résumé",
      content: (
        <Card><CardContent><dl>
          <DetailRow label="Compagnie">
            <Link href={`/compagnies/${c.companyId}`} className="hover:underline">{detail.companyName}</Link>
          </DetailRow>
          <DetailRow label="Objectif">{objectiveLabel(c.objective)}</DetailRow>
          <DetailRow label="Statut"><StatusBadge tone={status.tone}>{status.label}</StatusBadge></DetailRow>
          <DetailRow label="Début">{formatDate(c.startDate)}</DetailRow>
          <DetailRow label="Fin">{formatDate(c.endDate)}</DetailRow>
          <DetailRow label="Budget">{formatMoney(c.budget, c.currency)}</DetailRow>
          <DetailRow label="Créée par">{detail.createdByName}</DetailRow>
          <DetailRow label="Créée le">{formatDate(c.createdAt)}</DetailRow>
          <DetailRow label="Modifiée le">{c.updatedAt ? formatDateTime(c.updatedAt) : "—"}</DetailRow>
        </dl></CardContent></Card>
      ),
    },
    {
      value: "segments", label: "Segments",
      content: (
        <Card><CardContent>
          {detail.segments.length === 0 ? <Empty>Aucun segment propre à cette campagne.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Nom</th>
                  <th className="py-1 font-medium">Ciblage</th>
                  <th className="py-1 font-medium">Taille estimée</th>
                  <th className="py-1 font-medium">Éligibles aujourd&apos;hui</th>
                </tr>
              </thead>
              <tbody>
                {detail.segments.map((s) => (
                  <tr key={s.id} className="border-t border-border">
                    <td className="py-1.5 font-medium">{s.name}</td>
                    <td>{s.criteriaLabel}</td>
                    <td className="tabular-nums">{s.estimatedSize}</td>
                    <td className="tabular-nums">{s.eligibleNow}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent></Card>
      ),
    },
    {
      value: "messages", label: "Messages",
      content: (
        <div className="space-y-3">
          {detail.messages.length === 0 ? <Empty>Aucun message.</Empty> : detail.messages.map((m) => {
            const badge = messageStatusBadge(m.status);
            return (
              <Card key={m.id}><CardContent>
                <div className="mb-1 flex flex-wrap items-center gap-2">
                  <span className="font-medium">{m.subject}</span>
                  <StatusBadge tone={badge.tone}>{badge.label}</StatusBadge>
                  <span className="text-xs text-muted-foreground">{notificationChannelLabel(m.channel)}</span>
                </div>
                <p className="text-sm">{m.content}</p>
              </CardContent></Card>
            );
          })}
        </div>
      ),
    },
    {
      value: "programmations", label: "Programmations",
      content: (
        <Card><CardContent>
          {detail.schedules.length === 0 ? <Empty>Aucune programmation.</Empty> : (
            <table className="w-full text-left text-sm">
              <thead className="text-xs text-muted-foreground">
                <tr>
                  <th className="py-1 font-medium">Prévue le</th>
                  <th className="py-1 font-medium">Message</th>
                  <th className="py-1 font-medium">Segment</th>
                  <th className="py-1 font-medium">Statut</th>
                  <th className="py-1 font-medium">Destinataires</th>
                  <th className="py-1 font-medium">Envoyée le</th>
                </tr>
              </thead>
              <tbody>
                {detail.schedules.map((x) => {
                  const badge = scheduleStatusBadge(x.status);
                  return (
                    <tr key={x.id} className="border-t border-border">
                      <td className="py-1.5">{formatDateTime(x.scheduledAt)}</td>
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
        </CardContent></Card>
      ),
    },
  ];

  const defaultValue = initialTab && TAB_VALUES.includes(initialTab) ? initialTab : "resume";
  return <TabsWithUrl items={items} defaultValue={defaultValue} />;
}
