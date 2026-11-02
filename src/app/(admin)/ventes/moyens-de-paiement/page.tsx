import { PageHeader } from "@/components/data/page-header";
import { CompanyFilter } from "@/components/fleet/company-filter";
import { parseCompanyFilter } from "@/lib/repos/fleet";
import { paymentMethodsRepo } from "@/lib/repos/sales";
import { PaymentMethodsTable } from "./payment-methods-table";

export const dynamic = "force-dynamic";

export default async function PaymentMethodsPage({
  searchParams,
}: { searchParams: Promise<{ compagnie?: string }> }) {
  const { compagnie } = await searchParams;
  const companyId = parseCompanyFilter(compagnie);
  return (
    <>
      <PageHeader
        title="Moyens de paiement"
        description="Moyens de paiement acceptés par chaque compagnie, avec leur trafic et leur taux de réussite."
      />
      <CompanyFilter basePath="/ventes/moyens-de-paiement" current={companyId} />
      <PaymentMethodsTable methods={paymentMethodsRepo.listRows({ companyId })} />
    </>
  );
}
