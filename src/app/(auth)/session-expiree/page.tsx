import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function SessionExpireePage() {
  return (
    <AuthShell
      title="Votre session a expiré" description="Pour votre sécurité, vous avez été déconnecté après une période d'inactivité. Reconnectez-vous pour reprendre."
      footer={<Link href="/connexion" className="inline-flex h-12 items-center rounded-xl bg-accent px-6 text-base font-semibold text-accent-foreground hover:opacity-90">Retour à la connexion</Link>}
    />
  );
}
