import { redirect } from "next/navigation";

/** The list now lives in a tab of the « Offre et facturation » page. */
export default function Page() {
  redirect("/offre-facturation/documents");
}
