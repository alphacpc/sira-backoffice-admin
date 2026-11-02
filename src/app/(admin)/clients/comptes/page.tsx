import { redirect } from "next/navigation";

/** The list now lives in a tab of the « Colis et clients » page. */
export default function Page() {
  redirect("/colis-clients/comptes");
}
