import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function BusNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Bus introuvable</p>
        <Link href="/flotte/bus" className="mt-2 inline-block text-sm text-accent-text underline">
          Retour à la liste
        </Link>
      </CardContent>
    </Card>
  );
}
