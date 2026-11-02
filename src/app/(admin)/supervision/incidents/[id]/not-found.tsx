import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function IncidentNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Incident introuvable</p>
        <Link href="/supervision/incidents" className="mt-2 inline-block text-sm text-accent-text underline">Retour aux incidents</Link>
      </CardContent>
    </Card>
  );
}
