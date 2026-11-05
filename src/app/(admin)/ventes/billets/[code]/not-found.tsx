import { NotFoundView } from "@/components/data/not-found-view";

export default function VentesBilletsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Billet introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/ventes/billets" backLabel="Retour aux billets"
    />
  );
}
