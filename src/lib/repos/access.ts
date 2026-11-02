import { getStore } from "@/lib/repos/store";
import { truncateIp } from "@/lib/mask";
import type {
  ActivityEntry, PermissionDef, PermissionDomain, PlatformUser, Role, UserSession, UserStatus,
} from "@/lib/types";

/** Client-safe projection of an account: no e-mail, no phone. */
export interface UserRow {
  id: string;
  username: string;
  displayName: string;
  roleCode: string;
  roleName: string;
  status: UserStatus;
  companyId: string | null;
  companyName: string | null;
  lastLoginAt: string | null;
  activeSessions: number;
}

export type SessionState = "active" | "revoked" | "expired";

/** Client-safe projection of a session: the IP address is truncated (`a.b.c.0`). */
export interface SessionRow {
  id: string;
  userId: string;
  username: string;
  displayName: string;
  deviceLabel: string;
  ip: string;
  createdAt: string;
  lastSeenAt: string;
  expiresAt: string;
  state: SessionState;
  revokedAt: string | null;
  revokedReason: string | null;
}

export interface RoleRow extends Role {
  userCount: number;
  permissions: PermissionDef[];
}

export interface RoleOption { code: string; name: string }

export interface PermissionMatrix {
  roles: RoleOption[];
  groups: {
    domain: PermissionDomain;
    rows: { code: string; description: string; grantedTo: string[] }[];
  }[];
}

/** Server-only detail of an account (contains the raw contact data: never pass it to a client component). */
export interface UserDetail {
  user: PlatformUser;
  role: Role | null;
  companyName: string | null;
  permissions: PermissionDef[];
  sessions: SessionRow[];
  activeSessions: number;
  activity: ActivityEntry[];
}

/** Display order of the permission domains (matrix and role details). */
export const PERMISSION_DOMAINS: readonly PermissionDomain[] = [
  "companies", "fleet", "bookings", "parcels", "hr", "customers",
  "marketing", "notifications", "compliance", "monitoring", "platform",
];

/** A session counts as active only when it is neither revoked nor expired at `now`. */
export function sessionState(session: UserSession, now: Date): SessionState {
  if (session.revokedAt !== null) return "revoked";
  return new Date(session.expiresAt).getTime() > now.getTime() ? "active" : "expired";
}

function companyName(companyId: string | null): string | null {
  if (!companyId) return null;
  return getStore().companies.find((c) => c.id === companyId)?.name ?? null;
}

function roleName(code: string): string {
  return getStore().roles.find((r) => r.code === code)?.name ?? code;
}

function permissionsOf(roleCode: string): PermissionDef[] {
  const s = getStore();
  const codes = new Set(s.rolePermissions.filter((rp) => rp.roleCode === roleCode).map((rp) => rp.permissionCode));
  return PERMISSION_DOMAINS.flatMap((d) => s.permissions.filter((p) => p.domain === d && codes.has(p.code)));
}

function activeSessionsOf(userId: string, now: Date): UserSession[] {
  return getStore().sessions.filter((x) => x.userId === userId && sessionState(x, now) === "active");
}

function sessionRow(session: UserSession, now: Date): SessionRow {
  const user = getStore().users.find((u) => u.id === session.userId);
  return {
    id: session.id, userId: session.userId, username: user?.username ?? "—",
    displayName: user?.displayName ?? "—", deviceLabel: session.deviceLabel, ip: truncateIp(session.ipAddress),
    createdAt: session.createdAt, lastSeenAt: session.lastSeenAt, expiresAt: session.expiresAt,
    state: sessionState(session, now), revokedAt: session.revokedAt, revokedReason: session.revokedReason,
  };
}

function userRow(user: PlatformUser, now: Date): UserRow {
  return {
    id: user.id, username: user.username, displayName: user.displayName, roleCode: user.roleCode,
    roleName: roleName(user.roleCode), status: user.status, companyId: user.companyId,
    companyName: companyName(user.companyId), lastLoginAt: user.lastLoginAt,
    activeSessions: activeSessionsOf(user.id, now).length,
  };
}

function byNewest<T>(key: (x: T) => string): (a: T, b: T) => number {
  return (a, b) => key(b).localeCompare(key(a));
}

export const usersRepo = {
  listRows(filter: { roleCode?: string; status?: UserStatus } = {}, now: Date = new Date()): UserRow[] {
    return getStore().users
      .filter((u) => (!filter.roleCode || u.roleCode === filter.roleCode) && (!filter.status || u.status === filter.status))
      .map((u) => userRow(u, now))
      .sort((a, b) => a.displayName.localeCompare(b.displayName, "fr") || a.username.localeCompare(b.username));
  },

  get(id: string): PlatformUser | undefined {
    return getStore().users.find((u) => u.id === id);
  },

  detail(id: string, now: Date = new Date()): UserDetail | undefined {
    const s = getStore();
    const user = s.users.find((u) => u.id === id);
    if (!user) return undefined;
    const sessions = s.sessions
      .filter((x) => x.userId === id)
      .sort(byNewest((x) => x.createdAt))
      .map((x) => sessionRow(x, now));
    return {
      user,
      role: s.roles.find((r) => r.code === user.roleCode) ?? null,
      companyName: companyName(user.companyId),
      permissions: permissionsOf(user.roleCode),
      sessions,
      activeSessions: sessions.filter((x) => x.state === "active").length,
      activity: s.activity.filter((a) => a.userId === id).sort(byNewest((a) => a.at)),
    };
  },
};

export const rolesRepo = {
  list(): Role[] {
    return getStore().roles;
  },

  options(): RoleOption[] {
    return getStore().roles.map((r) => ({ code: r.code, name: r.name }));
  },

  listRows(): RoleRow[] {
    const s = getStore();
    return s.roles.map((r) => ({
      code: r.code, name: r.name, description: r.description,
      userCount: s.users.filter((u) => u.roleCode === r.code).length,
      permissions: permissionsOf(r.code),
    }));
  },
};

export const permissionsRepo = {
  list(): PermissionDef[] {
    return getStore().permissions;
  },

  matrix(): PermissionMatrix {
    const s = getStore();
    return {
      roles: rolesRepo.options(),
      groups: PERMISSION_DOMAINS
        .map((domain) => ({
          domain,
          rows: s.permissions.filter((p) => p.domain === domain).map((p) => ({
            code: p.code, description: p.description,
            grantedTo: s.roles
              .filter((r) => s.rolePermissions.some((rp) => rp.roleCode === r.code && rp.permissionCode === p.code))
              .map((r) => r.code),
          })),
        }))
        .filter((g) => g.rows.length > 0),
    };
  },
};

export const sessionsRepo = {
  /** Active sessions of the whole platform, most recently seen first. */
  activeRows(filter: { roleCode?: string } = {}, now: Date = new Date()): SessionRow[] {
    const s = getStore();
    return s.sessions
      .filter((x) => sessionState(x, now) === "active")
      .filter((x) => !filter.roleCode || s.users.find((u) => u.id === x.userId)?.roleCode === filter.roleCode)
      .sort(byNewest((x) => x.lastSeenAt))
      .map((x) => sessionRow(x, now));
  },

  get(id: string): UserSession | undefined {
    return getStore().sessions.find((x) => x.id === id);
  },
};
