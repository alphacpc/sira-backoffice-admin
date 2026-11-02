import { CommHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; canal?: string | string[] }> }) {
  return <CommHubPage tab="programmations" searchParams={props.searchParams} />;
}
