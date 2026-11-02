import { FleetHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default function Page(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; conducteur?: string | string[] }> }) {
  return <FleetHubPage tab="trajets" searchParams={props.searchParams} />;
}
