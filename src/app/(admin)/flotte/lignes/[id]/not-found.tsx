import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function RouteNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Ligne introuvable</p>
        <Link href="/flotte/lignes" className="mt-2 inline-block text-sm text-accent underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
