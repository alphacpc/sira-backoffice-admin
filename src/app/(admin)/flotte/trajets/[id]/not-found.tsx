import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function TripNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Trajet introuvable</p>
        <Link href="/flotte/trajets" className="mt-2 inline-block text-sm text-accent-text underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
