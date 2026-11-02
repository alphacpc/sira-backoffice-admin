import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { InviteAdminButton } from "@/components/settings/invite-admin-button";
import { requireSession } from "@/lib/auth/session";
import { parseFilter } from "@/lib/filters";
import { ADMIN_STATUSES, adminsRepo } from "@/lib/repos/backoffice";
import { AdminsTable } from "./admins-table";

export const dynamic = "force-dynamic";

const OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
  { value: "invited", label: "Invités" },
];

export default async function AdminTeamPage({ searchParams }: { searchParams: Promise<{ statut?: string }> }) {
  const sp = await searchParams;
  const status = parseFilter(sp.statut, ADMIN_STATUSES);
  const { sub } = await requireSession();
  return (
    <>
      <PageHeader
        title="Équipe admin"
        description="Administrateurs du backoffice. Le TOTP est obligatoire ; l'authentification reste celle de démonstration."
        actions={<InviteAdminButton />}
      />
      <StatusFilterNav basePath="/parametres/equipe-admin" options={OPTIONS} current={status} label="Filtrer par statut" />
      <AdminsTable admins={adminsRepo.listRows({ status }, new Date(), sub)} />
    </>
  );
}
