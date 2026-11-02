import { HubPage } from "./hub-page";

export const dynamic = "force-dynamic";

export default function OfferBillingPage(props: { searchParams: Promise<{ q?: string | string[]; statut?: string | string[]; page?: string | string[] }> }) {
  return <HubPage tab="plans" searchParams={props.searchParams} />;
}
