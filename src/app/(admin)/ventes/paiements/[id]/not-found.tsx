import { NotFoundView } from "@/components/data/not-found-view";

export default function VentesPaiementsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Paiement introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/ventes/paiements" backLabel="Retour aux paiements"
    />
  );
}
