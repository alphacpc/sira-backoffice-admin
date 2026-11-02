import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { NOTIFICATION_CHANNELS, NOTIFICATION_STATUSES, notificationsRepo } from "@/lib/repos/communication";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { NotificationsTable } from "./notifications-table";

export const dynamic = "force-dynamic";

const BASE = "/communication/notifications";
const CHANNEL_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les canaux" },
  { value: "EMAIL", label: "E-mail" },
  { value: "SMS", label: "SMS" },
  { value: "IN_APP", label: "Dans l'application" },
];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "PENDING", label: "En attente" },
  { value: "SENT", label: "Envoyées" },
  { value: "FAILED", label: "Échouées" },
];

export default async function NotificationsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; canal?: string; statut?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const channel = parseFilter(sp.canal, NOTIFICATION_CHANNELS);
  const status = parseFilter(sp.statut, NOTIFICATION_STATUSES);
  const keep = { compagnie: companyId, canal: channel, statut: status };
  const stats = notificationsRepo.stats({ companyId });
  return (
    <>
      <PageHeader
        title="Notifications"
        description="Messages envoyés aux voyageurs et aux destinataires de colis, du plus récent au plus ancien. Le contenu est masqué."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div data-testid="notif-sent"><KpiCard label="Envoyées" value={formatNumber(stats.sent)} /></div>
        <div data-testid="notif-failed">
          <KpiCard label="Échouées" value={formatNumber(stats.failed)} tone={stats.failed > 0 ? "danger" : "default"} hint="Aucune nouvelle tentative automatique" />
        </div>
        <div data-testid="notif-pending">
          <KpiCard label="En attente" value={formatNumber(stats.pending)} tone={stats.pending > 0 ? "warning" : "default"} />
        </div>
      </div>
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={CHANNEL_OPTIONS} current={channel} param="canal" keep={keep} label="Filtrer par canal" />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <NotificationsTable notifications={notificationsRepo.listRows({ companyId, channel, status })} />
    </>
  );
}
