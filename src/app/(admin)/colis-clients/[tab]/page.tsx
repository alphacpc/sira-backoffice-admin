import { notFound, redirect } from "next/navigation";
import { CARE_TABS, type CareTab } from "@/lib/repos/care-hub";
import { CareHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default async function CareTabPage(props: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ q?: string | string[]; compagnie?: string | string[]; statut?: string | string[]; type?: string | string[]; palier?: string | string[]; profil?: string | string[]; note?: string | string[]; page?: string | string[] }>;
}) {
  const { tab } = await props.params;
  if (tab === "apercu") redirect("/colis-clients");
  if (!(CARE_TABS as readonly string[]).includes(tab)) notFound();
  return <CareHubPage tab={tab as CareTab} searchParams={props.searchParams} />;
}
