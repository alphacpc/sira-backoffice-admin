import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";

export default function AccesRefusePage() {
  return (
    <AuthShell
      title="Accès refusé" description="Votre compte n'a pas les droits nécessaires pour consulter cette page. Demandez l'accès à un administrateur de la plateforme."
      footer={<Link href="/" className="inline-flex h-12 items-center rounded-xl bg-accent px-6 text-base font-semibold text-accent-foreground hover:opacity-90">Retour à l&apos;accueil</Link>}
    />
  );
}
