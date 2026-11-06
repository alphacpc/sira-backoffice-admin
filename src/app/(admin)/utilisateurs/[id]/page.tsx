import { notFound } from "next/navigation";
import { UserActions } from "@/components/access/user-actions";
import { UserTabs } from "@/components/access/user-tabs";
import { PageHeader } from "@/components/data/page-header";
import { StatusBadge } from "@/components/data/status-badge";
import { userStatusBadge } from "@/lib/labels";
import { isLive } from "@/lib/api/config";
import { liveRoleOptions, liveUserDetail } from "@/lib/api/access-live";
import { rolesRepo, usersRepo } from "@/lib/repos/access";

export const dynamic = "force-dynamic";

export default async function UserPage({
  params, searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ onglet?: string }>;
}) {
  const { id } = await params;
  const { onglet } = await searchParams;
  const live = isLive();
  const detail = live ? await liveUserDetail(id) : usersRepo.detail(id);
  if (!detail) notFound();
  const roleOptions = live ? await liveRoleOptions() : rolesRepo.options();
  const { user } = detail;
  const badge = userStatusBadge(user.status);
  return (
    <>
      <PageHeader
        title={user.displayName}
        description={`Identifiant : ${user.username}`}
        actions={
          <>
            <span data-testid="user-role"><StatusBadge tone="info">{detail.role?.name ?? user.roleCode}</StatusBadge></span>
            <span data-testid="user-status"><StatusBadge tone={badge.tone}>{badge.label}</StatusBadge></span>
            <UserActions
              userId={user.id} displayName={user.displayName} roleCode={user.roleCode}
              roles={roleOptions} activeSessions={detail.activeSessions}
            />
          </>
        }
      />
      <UserTabs detail={detail} initialTab={onglet} />
    </>
  );
}
