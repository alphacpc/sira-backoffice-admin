import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseFilter } from "@/lib/filters";
import { AUDIT_ACTIONS, auditRepo } from "@/lib/repos/compliance";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { AuditTable } from "./audit-table";

export const dynamic = "force-dynamic";

const BASE = "/conformite/journal-audit";
const ACTION_OPTIONS: FilterOption[] = [
  { value: "all", label: "Toutes" },
  { value: "CREATE", label: "Création" },
  { value: "UPDATE", label: "Modification" },
  { value: "LOGIN", label: "Connexion" },
  { value: "LOGIN_FAILED", label: "Échec de connexion" },
  { value: "PERMISSION_CHANGE", label: "Changement de permission" },
];

export default async function AuditLogPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string; action?: string }> }) {
  const sp = await searchParams;
  const companyId = parseCompanyFilter(sp.compagnie);
  const action = parseFilter(sp.action, AUDIT_ACTIONS);
  const keep = { compagnie: companyId, action };
  return (
    <>
      <PageHeader
        title="Journal d'audit"
        description="Actions sensibles de toute la plateforme, de la plus récente à la plus ancienne. Les adresses IP sont tronquées."
      />
      <p data-testid="audit-readonly" className="mb-4 text-sm text-muted-foreground">
        Journal en lecture seule : aucune ligne ne peut être modifiée ni supprimée.
      </p>
      <CompanyFilter basePath={BASE} current={companyId} keep={keep} />
      <StatusFilterNav basePath={BASE} options={ACTION_OPTIONS} current={action} param="action" keep={keep} label="Filtrer par action" />
      <AuditTable lines={auditRepo.listRows({ companyId, action })} />
    </>
  );
}
