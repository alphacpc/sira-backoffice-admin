import { PageHeader } from "@/components/data/page-header";
import { customersRepo } from "@/lib/repos/clients";
import { CustomersTable } from "./customers-table";

export const dynamic = "force-dynamic";

export default function CustomersPage() {
  return (
    <>
      <PageHeader
        title="Comptes clients"
        description="Voyageurs inscrits en libre-service, avec leurs points de fidélité, leurs colis et leurs avis. Aucun e-mail ni téléphone n'est affiché."
      />
      <CustomersTable customers={customersRepo.listRows()} />
    </>
  );
}
