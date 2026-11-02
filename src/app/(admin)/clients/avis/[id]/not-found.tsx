import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function FeedbackNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Avis introuvable</p>
        <Link href="/clients/avis" className="mt-2 inline-block text-sm text-accent underline">Retour aux avis</Link>
      </CardContent>
    </Card>
  );
}
