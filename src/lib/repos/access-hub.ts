import {
  PERMISSION_DOMAINS, permissionsRepo, rolesRepo, sessionsRepo, usersRepo,
  type PermissionMatrix, type RoleRow, type SessionRow, type UserRow,
} from "@/lib/repos/access";
import { permissionDomainLabel } from "@/lib/labels";
import type { PermissionDomain, UserStatus } from "@/lib/types";

export const ACCESS_TABS = ["utilisateurs", "roles", "permissions", "sessions"] as const;
export type AccessTab = (typeof ACCESS_TABS)[number];

/** Lower-case and strip accents so « responsable » finds « Responsable ». */
export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}

export const accessRepo = {
  users(q?: string, f: { role?: string; status?: UserStatus } = {}): UserRow[] {
    const hit = matcher(q);
    return usersRepo.listRows({ roleCode: f.role, status: f.status })
      .filter((u) => hit(u.displayName, u.username, u.roleName, u.roleCode, u.companyName, u.status === "active" ? "actif" : "suspendu"));
  },

  roles(q?: string): RoleRow[] {
    const hit = matcher(q);
    return rolesRepo.listRows().filter((r) => hit(r.name, r.code, r.description, ...r.permissions.map((p) => p.code)));
  },

  /** Permission matrix reduced to the rows matching the query and the domain. */
  permissions(q?: string, domain?: PermissionDomain): PermissionMatrix {
    const hit = matcher(q);
    const m = permissionsRepo.matrix();
    return {
      roles: m.roles,
      groups: m.groups
        .filter((g) => !domain || g.domain === domain)
        .map((g) => ({ ...g, rows: g.rows.filter((r) => hit(r.code, r.description, permissionDomainLabel(g.domain))) }))
        .filter((g) => g.rows.length > 0),
    };
  },

  sessions(q?: string, f: { role?: string } = {}): SessionRow[] {
    const hit = matcher(q);
    return sessionsRepo.activeRows({ roleCode: f.role }).filter((s) => hit(s.displayName, s.username, s.deviceLabel, s.ip));
  },

  counts(q?: string): Record<AccessTab, number> {
    return {
      utilisateurs: accessRepo.users(q).length,
      roles: accessRepo.roles(q).length,
      permissions: accessRepo.permissions(q).groups.reduce((n, g) => n + g.rows.length, 0),
      sessions: accessRepo.sessions(q).length,
    };
  },
};

export { PERMISSION_DOMAINS };
