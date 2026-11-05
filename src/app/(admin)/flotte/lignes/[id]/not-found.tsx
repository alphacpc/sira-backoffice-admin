import { NotFoundView } from "@/components/data/not-found-view";

export default function FlotteLignesNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Ligne introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/flotte/lignes" backLabel="Retour aux lignes"
    />
  );
}
