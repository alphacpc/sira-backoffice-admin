import { RetentionTable } from "@/components/compliance/retention-table";
import { PageHeader } from "@/components/data/page-header";
import { DEFAULT_RETENTION_DAYS, MAX_RETENTION_DAYS, MIN_RETENTION_DAYS, retentionRepo } from "@/lib/repos/compliance";

export const dynamic = "force-dynamic";

export default function RetentionPage() {
  return (
    <>
      <PageHeader
        title="Rétention des données"
        description={`Un job quotidien (03:15 UTC) efface l'adresse IP et l'agent utilisateur des lignes de journal plus anciennes que la durée de leur compagnie (${DEFAULT_RETENTION_DAYS} jours par défaut, entre ${MIN_RETENTION_DAYS} et ${MAX_RETENTION_DAYS}). Les lignes ne sont jamais supprimées. Raccourcir une durée est irréversible.`}
      />
      <RetentionTable rows={retentionRepo.listRows(new Date())} />
    </>
  );
}
