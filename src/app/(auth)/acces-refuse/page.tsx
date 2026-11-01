import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function AccesRefusePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-xl font-semibold">Accès refusé</h1>
          <p className="text-sm text-muted-foreground">
            Tu n&apos;as pas les droits nécessaires pour consulter cette page.
          </p>
          <Link href="/" className="inline-block text-sm font-medium text-accent underline">
            Retour à l&apos;accueil
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
