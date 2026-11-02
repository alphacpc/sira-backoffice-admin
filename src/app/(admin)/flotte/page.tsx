import { FleetHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function FleetPage(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[] }> }) {
  return <FleetHubPage tab="apercu" searchParams={props.searchParams} />;
}
