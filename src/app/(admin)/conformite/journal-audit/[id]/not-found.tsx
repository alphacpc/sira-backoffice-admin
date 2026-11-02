import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function AuditLineNotFound() {
  return (
    <Card>
      <CardContent className="py-12 text-center">
        <p className="text-lg font-medium">Ligne de journal introuvable</p>
        <Link href="/conformite/journal-audit" className="mt-2 inline-block text-sm text-accent underline">Retour au journal d&apos;audit</Link>
      </CardContent>
    </Card>
  );
}
