import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function BookingNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Réservation introuvable</p>
        <Link href="/ventes/reservations" className="mt-2 inline-block text-sm text-accent-text underline">
          Retour aux réservations
        </Link>
      </CardContent>
    </Card>
  );
}
