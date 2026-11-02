import { KpiCard } from "@/components/data/kpi-card";
import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { formatNumber } from "@/lib/format";
import { parseFilter } from "@/lib/filters";
import { DSR_STATUSES, DSR_TYPES, dsrRepo } from "@/lib/repos/compliance";
import { RequestsTable } from "./requests-table";

export const dynamic = "force-dynamic";

const BASE = "/conformite/demandes-rgpd";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "RECEIVED", label: "Reçues" },
  { value: "IN_PROGRESS", label: "En cours" },
  { value: "COMPLETED", label: "Clôturées" },
  { value: "REJECTED", label: "Rejetées" },
];
const TYPE_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les types" },
  { value: "ACCESS", label: "Accès" },
  { value: "RECTIFICATION", label: "Rectification" },
  { value: "ERASURE", label: "Effacement" },
  { value: "PORTABILITY", label: "Portabilité" },
  { value: "RESTRICTION", label: "Limitation" },
  { value: "OBJECTION", label: "Opposition" },
];
const LATE_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes les échéances" },
  { value: "oui", label: "En retard" },
];

export default async function DataSubjectRequestsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string; type?: string; retard?: string }> }) {
  const sp = await searchParams;
  const status = parseFilter(sp.statut, DSR_STATUSES);
  const type = parseFilter(sp.type, DSR_TYPES);
  const late = parseFilter(sp.retard, ["oui"] as const);
  const keep = { statut: status, type, retard: late };
  const now = new Date();
  const stats = dsrRepo.stats(now);
  return (
    <>
      <PageHeader
        title="Demandes RGPD"
        description="Droits des personnes concernées : accès, rectification, effacement, portabilité, limitation, opposition. Le délai légal de traitement est de 30 jours."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div data-testid="dsr-open"><KpiCard label="Ouvertes" value={formatNumber(stats.open)} /></div>
        <div data-testid="dsr-overdue">
          <KpiCard label="En retard" value={formatNumber(stats.overdue)} tone={stats.overdue > 0 ? "danger" : "default"} hint="Échéance dépassée" />
        </div>
        <div data-testid="dsr-soon">
          <KpiCard label="À échéance sous 7 jours" value={formatNumber(stats.dueSoon)} tone={stats.dueSoon > 0 ? "warning" : "default"} />
        </div>
        <div data-testid="dsr-closed"><KpiCard label="Closes" value={formatNumber(stats.closed)} /></div>
      </div>
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={TYPE_OPTIONS} current={type} param="type" keep={keep} label="Filtrer par type" />
      <StatusFilterNav basePath={BASE} options={LATE_OPTIONS} current={late} param="retard" keep={keep} label="Filtrer par échéance" />
      <RequestsTable requests={dsrRepo.listRows({ status, type, overdueOnly: late === "oui" }, now)} />
    </>
  );
}
