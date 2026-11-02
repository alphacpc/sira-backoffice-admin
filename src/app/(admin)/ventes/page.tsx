import { SalesHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function SalesPage(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[]; periode?: string | string[] }> }) {
  return <SalesHubPage tab="apercu" searchParams={props.searchParams} />;
}
