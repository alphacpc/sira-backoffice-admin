import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function ParcelNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Colis introuvable</p>
        <Link href="/colis" className="mt-2 inline-block text-sm text-accent-text underline">Retour aux colis</Link>
      </CardContent>
    </Card>
  );
}
