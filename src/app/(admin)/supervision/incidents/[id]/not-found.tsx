import { NotFoundView } from "@/components/data/not-found-view";

export default function SupervisionIncidentsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Incident introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/supervision/incidents" backLabel="Retour aux incidents"
    />
  );
}
