import { AccessHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function UsersAccessPage(props: { searchParams: Promise<{ q?: string | string[]; role?: string | string[]; statut?: string | string[] }> }) {
  return <AccessHubPage tab="utilisateurs" searchParams={props.searchParams} />;
}
