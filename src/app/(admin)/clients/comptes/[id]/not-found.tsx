import { NotFoundView } from "@/components/data/not-found-view";

export default function ClientsComptesNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Client introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/clients/comptes" backLabel="Retour aux comptes clients"
    />
  );
}
