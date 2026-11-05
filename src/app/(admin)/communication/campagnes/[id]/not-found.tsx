import { NotFoundView } from "@/components/data/not-found-view";

export default function CommunicationCampagnesNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Campagne introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/communication/campagnes" backLabel="Retour aux campagnes"
    />
  );
}
