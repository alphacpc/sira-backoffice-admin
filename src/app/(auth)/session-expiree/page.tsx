import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionExpireePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 py-8 text-center">
          <h1 className="text-xl font-semibold">Session expirée</h1>
          <p className="text-sm text-muted-foreground">
            Pour ta sécurité, tu as été déconnecté. Reconnecte-toi pour continuer.
          </p>
          <Link href="/connexion" className="inline-block text-sm font-medium text-accent underline">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
