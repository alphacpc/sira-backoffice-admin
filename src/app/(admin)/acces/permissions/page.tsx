import { redirect } from "next/navigation";

/** The list now lives in a tab of the « Utilisateurs et accès » page. */
export default function Page() {
  redirect("/utilisateurs-acces/permissions");
}
