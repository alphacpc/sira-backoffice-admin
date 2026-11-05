import { NotFoundView } from "@/components/data/not-found-view";

export default function ColisNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Colis introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/colis" backLabel="Retour aux colis"
    />
  );
}
