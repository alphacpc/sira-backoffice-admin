import { SalesHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[]; statut?: string | string[] }> }) {
  return <SalesHubPage tab="factures" searchParams={props.searchParams} />;
}
