import { AUTH_PANELS, AuthShell, type AuthPanel } from "@/components/auth/auth-shell";
import { firstString } from "@/lib/search-params";
import { LoginForm } from "./login-form";

export default async function ConnexionPage(props: { searchParams: Promise<{ disposition?: string | string[] }> }) {
  const asked = firstString((await props.searchParams).disposition);
  const panel = AUTH_PANELS.find((p) => p === asked) as AuthPanel | undefined;
  return (
    <AuthShell
      title="Bon retour parmi nous" description="Connectez-vous à la console d'administration de la plateforme."
      step={{ current: 1, total: 2, label: "Identifiants" }} panel={panel}
    >
      <LoginForm />
    </AuthShell>
  );
}
