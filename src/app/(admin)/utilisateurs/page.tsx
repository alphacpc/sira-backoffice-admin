import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { rolesRepo, usersRepo } from "@/lib/repos/access";
import type { UserStatus } from "@/lib/types";
import { UsersTable } from "./users-table";

export const dynamic = "force-dynamic";

const STATUSES = ["active", "suspended"] as const satisfies readonly UserStatus[];
const STATUS_OPTIONS: FilterOption[] = [
  { value: "all", label: "Tous les statuts" },
  { value: "active", label: "Actifs" },
  { value: "suspended", label: "Suspendus" },
];

export default async function UsersPage({
  searchParams,
}: { searchParams: Promise<{ role?: string; statut?: string }> }) {
  const params = await searchParams;
  const roles = rolesRepo.options();
  const role = parseFilter(params.role, roles.map((r) => r.code));
  const status = parseFilter(params.statut, STATUSES);
  const roleOptions: FilterOption[] = [
    { value: "all", label: "Tous les rôles" },
    ...roles.map((r) => ({ value: r.code, label: r.name })),
  ];
  return (
    <>
      <PageHeader title="Utilisateurs" description="Tous les comptes de la plateforme : équipes des compagnies, clients et administrateurs." />
      <StatusFilterNav
        basePath="/utilisateurs" options={roleOptions} current={role} param="role"
        label="Filtrer par rôle" keep={{ statut: status }}
      />
      <StatusFilterNav basePath="/utilisateurs" options={STATUS_OPTIONS} current={status} keep={{ role }} />
      <UsersTable users={usersRepo.listRows({ roleCode: role, status })} />
    </>
  );
}
