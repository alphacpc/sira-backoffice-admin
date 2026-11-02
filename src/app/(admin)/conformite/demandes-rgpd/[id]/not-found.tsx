import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function DataSubjectRequestNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Demande introuvable</p>
        <Link href="/conformite/demandes-rgpd" className="mt-2 inline-block text-sm text-accent underline">Retour aux demandes</Link>
      </CardContent>
    </Card>
  );
}
