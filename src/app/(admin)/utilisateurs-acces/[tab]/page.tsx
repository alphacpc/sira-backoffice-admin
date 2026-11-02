import { notFound, redirect } from "next/navigation";
import { ACCESS_TABS, type AccessTab } from "@/lib/repos/access-hub";
import { AccessHubPage } from "../hub-page";

export const dynamic = "force-dynamic";

export default async function UsersAccessTabPage(props: {
  params: Promise<{ tab: string }>;
  searchParams: Promise<{ q?: string | string[]; role?: string | string[]; statut?: string | string[]; domaine?: string | string[] }>;
}) {
  const { tab } = await props.params;
  if (tab === "utilisateurs") redirect("/utilisateurs-acces");
  if (!(ACCESS_TABS as readonly string[]).includes(tab)) notFound();
  return <AccessHubPage tab={tab as AccessTab} searchParams={props.searchParams} />;
}
