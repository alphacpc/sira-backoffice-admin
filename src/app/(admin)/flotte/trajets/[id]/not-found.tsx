import { NotFoundView } from "@/components/data/not-found-view";

export default function FlotteTrajetsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Trajet introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/flotte/trajets" backLabel="Retour aux trajets"
    />
  );
}
