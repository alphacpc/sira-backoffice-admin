import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth/auth-shell";
import { PRE_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken } from "@/lib/auth/token";
import { TotpForm } from "./totp-form";

export default async function VerificationPage() {
  const raw = (await cookies()).get(PRE_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (!payload || payload.stage !== "pre") redirect("/connexion");
  return (
    <AuthShell
      title="Vérification en deux étapes" description="Saisissez le code à 6 chiffres affiché dans votre application d'authentification."
      step={{ current: 2, total: 2, label: "Vérification" }}
      footer={<Link href="/connexion" className="text-sm font-semibold text-accent-text hover:underline">← Changer de compte</Link>}
    >
      <TotpForm />
    </AuthShell>
  );
}
