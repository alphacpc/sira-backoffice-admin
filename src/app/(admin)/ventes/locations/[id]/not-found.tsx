import { NotFoundView } from "@/components/data/not-found-view";

export default function VentesLocationsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Location introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/ventes/locations" backLabel="Retour aux locations"
    />
  );
}
