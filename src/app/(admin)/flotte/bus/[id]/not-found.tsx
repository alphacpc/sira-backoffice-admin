import { NotFoundView } from "@/components/data/not-found-view";

export default function FlotteBusNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Bus introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/flotte/bus" backLabel="Retour aux bus"
    />
  );
}
