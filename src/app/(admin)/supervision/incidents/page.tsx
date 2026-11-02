import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { DeclareIncidentButton } from "@/components/monitoring/declare-incident-button";
import { parseFilter } from "@/lib/filters";
import { INCIDENT_SEVERITIES, INCIDENT_STATUSES, incidentsRepo, servicesRepo } from "@/lib/repos/monitoring";
import { getStore } from "@/lib/repos/store";
import { IncidentsTable } from "./incidents-table";

export const dynamic = "force-dynamic";

const BASE = "/supervision/incidents";
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "INVESTIGATING", label: "En investigation" },
  { value: "IDENTIFIED", label: "Identifiés" },
  { value: "MONITORING", label: "Sous surveillance" },
  { value: "RESOLVED", label: "Résolus" },
];
const SEVERITY_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes les gravités" },
  { value: "LOW", label: "Faible" },
  { value: "MEDIUM", label: "Moyenne" },
  { value: "HIGH", label: "Haute" },
  { value: "CRITICAL", label: "Critique" },
];

export default async function IncidentsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string; gravite?: string; service?: string }> }) {
  const sp = await searchParams;
  const status = parseFilter(sp.statut, INCIDENT_STATUSES);
  const severity = parseFilter(sp.gravite, INCIDENT_SEVERITIES);
  const serviceName = parseFilter(sp.service, servicesRepo.names());
  const keep = { statut: status, gravite: severity, service: serviceName };
  const companies = getStore().companies.filter((c) => c.status === "active").map((c) => ({ id: c.id, name: c.name }));
  return (
    <>
      <PageHeader
        title="Incidents"
        description={serviceName
          ? `Incidents plateforme du service ${serviceName}, du plus récent au plus ancien.`
          : "Incidents plateforme, déclarés et suivis à la main, du plus récent au plus ancien."}
        actions={<DeclareIncidentButton services={servicesRepo.names()} companies={companies} />}
      />
      <StatusFilterNav basePath={BASE} options={STATUS_OPTIONS} current={status} keep={keep} label="Filtrer par statut" />
      <StatusFilterNav basePath={BASE} options={SEVERITY_OPTIONS} current={severity} param="gravite" keep={keep} label="Filtrer par gravité" />
      <IncidentsTable incidents={incidentsRepo.listRows({ status, severity, serviceName })} />
    </>
  );
}
