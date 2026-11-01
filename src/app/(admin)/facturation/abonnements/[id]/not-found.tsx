import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SubscriptionNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Abonnement introuvable</p>
        <Link href="/facturation/abonnements" className="mt-2 inline-block text-sm text-accent underline">
          Retour aux abonnements
        </Link>
      </CardContent>
    </Card>
  );
}
