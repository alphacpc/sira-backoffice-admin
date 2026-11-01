import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { subscriptionsRepo } from "@/lib/repos/billing";
import type { SubscriptionStatus } from "@/lib/types";
import { SubscriptionsTable } from "./subscriptions-table";

export const dynamic = "force-dynamic";

const STATUSES = ["trial", "active", "past_due", "suspended", "expired", "canceled"] as const satisfies readonly SubscriptionStatus[];
const OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "trial", label: "Essai" },
  { value: "active", label: "Actifs" },
  { value: "past_due", label: "Impayés" },
  { value: "suspended", label: "Suspendus" },
  { value: "expired", label: "Expirés" },
  { value: "canceled", label: "Annulés" },
];

export default async function SubscriptionsPage({
  searchParams,
}: { searchParams: Promise<{ statut?: string }> }) {
  const { statut } = await searchParams;
  const status = parseFilter(statut, STATUSES);
  return (
    <>
      <PageHeader title="Abonnements" description="Les abonnements des compagnies aux plans de Sira." />
      <StatusFilterNav basePath="/facturation/abonnements" options={OPTIONS} current={status} />
      <SubscriptionsTable subscriptions={subscriptionsRepo.listRows({ status })} />
    </>
  );
}
