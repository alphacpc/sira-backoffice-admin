import { NotFoundView } from "@/components/data/not-found-view";

export default function UtilisateursNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Utilisateur introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/utilisateurs" backLabel="Retour aux utilisateurs"
    />
  );
}
