import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { PRE_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken } from "@/lib/auth/token";
import { TotpForm } from "./totp-form";

export default async function VerificationPage() {
  const raw = (await cookies()).get(PRE_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (!payload || payload.stage !== "pre") redirect("/connexion");
  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardContent className="space-y-6 py-8">
          <div>
            <h1 className="text-xl font-semibold">Vérification en deux étapes</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Saisis le code de ton application d&apos;authentification.
            </p>
          </div>
          <TotpForm />
        </CardContent>
      </Card>
    </main>
  );
}
