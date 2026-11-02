import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function TicketNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Billet introuvable</p>
        <Link href="/ventes/billets" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux billets
        </Link>
      </CardContent>
    </Card>
  );
}
