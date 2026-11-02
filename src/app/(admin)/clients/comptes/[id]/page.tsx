import { notFound } from "next/navigation";
import { CustomerTabs } from "@/components/clients/customer-tabs";
import { PageHeader } from "@/components/data/page-header";
import { customersRepo } from "@/lib/repos/clients";

export const dynamic = "force-dynamic";

export default async function CustomerPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const detail = customersRepo.detail(id);
  if (!detail) notFound();
  return (
    <>
      <PageHeader
        title={detail.customer.name}
        description={detail.customer.isCorporate ? "Compte entreprise" : "Compte particulier"}
      />
      <CustomerTabs detail={detail} initialTab={onglet} />
    </>
  );
}
