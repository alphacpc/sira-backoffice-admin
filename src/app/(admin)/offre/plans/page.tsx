import { PageHeader } from "@/components/data/page-header";
import { plansRepo } from "@/lib/repos/billing";
import { PlansTable } from "./plans-table";

export const dynamic = "force-dynamic";

export default function PlansPage() {
  return (
    <>
      <PageHeader
        title="Plans"
        description="Les offres d'abonnement vendues par Sira aux compagnies (lecture seule)."
      />
      <PlansTable plans={plansRepo.listRows()} />
    </>
  );
}
