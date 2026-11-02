import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function TransactionNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Paiement introuvable</p>
        <Link href="/ventes/paiements" className="mt-2 inline-block text-sm text-accent-text underline">
          Retour aux paiements
        </Link>
      </CardContent>
    </Card>
  );
}
