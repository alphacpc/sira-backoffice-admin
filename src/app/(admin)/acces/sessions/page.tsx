import { PageHeader } from "@/components/data/page-header";
import { StatusFilterNav, type FilterOption } from "@/components/data/status-filter-nav";
import { parseFilter } from "@/lib/filters";
import { rolesRepo, sessionsRepo } from "@/lib/repos/access";
import { SessionsTable } from "./sessions-table";

export const dynamic = "force-dynamic";

export default async function SessionsPage({
  searchParams,
}: { searchParams: Promise<{ role?: string }> }) {
  const params = await searchParams;
  const roles = rolesRepo.options();
  const role = parseFilter(params.role, roles.map((r) => r.code));
  const options: FilterOption[] = [
    { value: "all", label: "Tous les rôles" },
    ...roles.map((r) => ({ value: r.code, label: r.name })),
  ];
  return (
    <>
      <PageHeader
        title="Sessions"
        description="Sessions actives de toute la plateforme. Les adresses IP sont tronquées au réseau (a.b.c.0)."
      />
      <StatusFilterNav basePath="/acces/sessions" options={options} current={role} param="role" label="Filtrer par rôle" />
      <SessionsTable sessions={sessionsRepo.activeRows({ roleCode: role })} />
    </>
  );
}
