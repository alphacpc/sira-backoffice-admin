import { CareHubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function CarePage(props: { searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[] }> }) {
  return <CareHubPage tab="apercu" searchParams={props.searchParams} />;
}
