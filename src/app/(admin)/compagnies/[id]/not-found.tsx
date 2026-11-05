import { NotFoundView } from "@/components/data/not-found-view";

export default function CompagniesNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Compagnie introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/compagnies" backLabel="Retour aux compagnies"
    />
  );
}
