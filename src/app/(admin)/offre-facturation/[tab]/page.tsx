import { notFound, redirect } from "next/navigation";
import { HUB_TABS, type HubTab } from "@/lib/repos/billing-hub";
import { HubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default async function OfferBillingTabPage(props: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ q?: string | string[]; statut?: string | string[]; page?: string | string[] }>;
}) {
  const { tab } = await props.params;
  if (tab === "plans") redirect("/offre-facturation");
  if (!(HUB_TABS as readonly string[]).includes(tab)) notFound();
  return <HubPage tab={tab as HubTab} searchParams={props.searchParams} />;
}
