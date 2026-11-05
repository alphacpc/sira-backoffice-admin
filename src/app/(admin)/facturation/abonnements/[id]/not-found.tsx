import { NotFoundView } from "@/components/data/not-found-view";

export default function FacturationAbonnementsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Abonnement introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/facturation/abonnements" backLabel="Retour aux abonnements"
    />
  );
}
