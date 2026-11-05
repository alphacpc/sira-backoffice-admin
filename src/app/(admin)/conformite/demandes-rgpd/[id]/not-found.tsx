import { NotFoundView } from "@/components/data/not-found-view";

export default function ConformiteDemandesRgpdNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Demande introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/conformite/demandes-rgpd" backLabel="Retour aux demandes"
    />
  );
}
