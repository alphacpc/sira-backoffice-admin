import { NotFoundView } from "@/components/data/not-found-view";

export default function ConformiteJournalAuditNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Ligne de journal introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/conformite/journal-audit" backLabel="Retour au journal d'audit"
    />
  );
}
