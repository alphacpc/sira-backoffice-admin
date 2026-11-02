import { Card, CardContent } from "@/components/ui/card";
import { ThemedLogo } from "@/components/shell/logo";
import { LoginForm } from "./login-form";

export default function ConnexionPage() {
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 py-8">
          <div>
            <ThemedLogo height={36} />
            <h1 className="mt-4 text-xl font-semibold">Connexion au backoffice</h1>
            <p className="mt-1 text-sm text-muted-foreground">Réservé à l&apos;équipe plateforme.</p>
          </div>
          <LoginForm />
          <p className="text-xs text-muted-foreground">
            Démo : admin@sira.app / sira-demo, puis le code 123456.
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
