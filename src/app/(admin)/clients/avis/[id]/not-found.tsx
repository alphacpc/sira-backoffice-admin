import { NotFoundView } from "@/components/data/not-found-view";

export default function ClientsAvisNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Avis introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/clients/avis" backLabel="Retour aux avis"
    />
  );
}
