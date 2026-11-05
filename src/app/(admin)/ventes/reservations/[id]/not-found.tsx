import { NotFoundView } from "@/components/data/not-found-view";

export default function VentesReservationsNotFound() {
  return (
    <NotFoundView
      variant="inline" title="Réservation introuvable" description="Cet élément a peut-être été supprimé, ou le lien est incorrect."
      backHref="/ventes/reservations" backLabel="Retour aux réservations"
    />
  );
}
