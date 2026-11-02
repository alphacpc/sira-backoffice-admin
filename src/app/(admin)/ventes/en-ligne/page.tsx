import { SalesHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; paiement?: string | string[]; canal?: string | string[]; anomalie?: string | string[]; page?: string | string[] }> }) {
  return <SalesHubPage tab="en-ligne" searchParams={props.searchParams} />;
}
