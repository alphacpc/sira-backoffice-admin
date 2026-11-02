import Link from "next/link";
import { ThemedLogo } from "@/components/shell/logo";
import { Card, CardContent } from "@/components/ui/card";

export default function SessionExpireePage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-4 py-8 text-center">
          <div className="flex justify-center"><ThemedLogo height={32} /></div>
          <h1 className="text-xl font-semibold">Session expirée</h1>
          <p className="text-sm text-muted-foreground">
            Pour ta sécurité, tu as été déconnecté. Reconnecte-toi pour continuer.
          </p>
          <Link href="/connexion" className="inline-block text-sm font-medium text-accent-text underline">
            Retour à la connexion
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
