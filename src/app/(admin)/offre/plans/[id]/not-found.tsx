import { NotFoundView } from "@/components/data/not-found-view";

export default function OffrePlansNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Plan introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/offre/plans" backLabel="Retour aux plans"
    />
  );
}
