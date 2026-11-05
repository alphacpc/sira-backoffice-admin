import { NotFoundView } from "@/components/data/not-found-view";

export default function FacturationFacturesNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Facture introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/facturation/factures" backLabel="Retour aux factures"
    />
  );
}
