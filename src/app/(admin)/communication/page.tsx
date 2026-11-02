import { CommHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function CommunicationPage(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[] }> }) {
  return <CommHubPage tab="apercu" searchParams={props.searchParams} />;
}
