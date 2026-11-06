import { loadAll, names as companyNames, soft } from "@/lib/api/care-live";
import { arr, num, numOrNull, obj, pick, str, strOrNull, withFilters } from "@/lib/api/sales-live";
import { truncateIp } from "@/lib/mask";
import { PERMISSION_DOMAINS, type PermissionMatrix, type RoleOption, type RoleRow, type SessionRow, type UserRow } from "@/lib/repos/access";
import type { AccessTab } from "@/lib/repos/access-hub";
import type { PermissionDef, PermissionDomain, UserStatus } from "@/lib/types";

type Names = Map<string, string>;

/** Neither e-mail nor phone is read: the list endpoints only return masked values and the table never shows them. */
export function toUserRow(raw: unknown, names: Names): UserRow {
  const u = obj(raw);
  const company = strOrNull(u.companyId);
  return {
    id: str(u.id), username: str(u.username, "—"), displayName: str(u.displayName) || str(u.username, "—"),
    roleCode: str(u.roleCode), roleName: str(u.roleName) || str(u.roleCode, "—"),
    status: str(u.status).toLowerCase() === "suspended" ? "suspended" : "active" satisfies UserStatus,
    companyId: company, companyName: company ? (names.get(company) ?? "—") : null,
    lastLoginAt: strOrNull(u.lastLoginAt), activeSessions: num(u.activeSessions),
  };
}

export function toPermission(raw: unknown): PermissionDef {
  const p = obj(raw);
  return { code: str(p.code), domain: pick<PermissionDomain>(p.domain, PERMISSION_DOMAINS, false, "platform"), description: str(p.description) || str(p.name, "—") };
}

export function toRoleRow(raw: unknown): RoleRow {
  const r = obj(raw);
  return { code: str(r.code), name: str(r.name, "—"), description: str(r.description), userCount: num(r.userCount), permissions: arr(r.permissions).map(toPermission) };
}

export function toSessionRow(raw: unknown): SessionRow {
  const s = obj(raw);
  const state = str(s.state).toLowerCase();
  return {
    id: str(s.id), userId: str(s.userId), username: str(s.username, "—"), displayName: str(s.displayName) || str(s.username, "—"),
    deviceLabel: str(s.deviceLabel, "—"), ip: truncateIp(str(s.ip)), createdAt: str(s.createdAt), lastSeenAt: str(s.lastSeenAt),
    expiresAt: str(s.expiresAt), state: state === "revoked" || state === "expired" ? state : "active",
    revokedAt: strOrNull(s.revokedAt), revokedReason: strOrNull(s.revokedReason),
  };
}

export function toMatrix(raw: unknown): PermissionMatrix {
  const m = obj(raw);
  return {
    roles: arr(m.roles).map((r) => ({ code: str(r.code), name: str(r.name, "—") })),
    groups: arr(m.groups).map((g) => ({
      domain: pick<PermissionDomain>(g.domain, PERMISSION_DOMAINS, false, "platform"),
      rows: arr(g.rows).map((r) => ({ code: str(r.code), description: str(r.description), grantedTo: Array.isArray(r.grantedTo) ? r.grantedTo.filter((x): x is string => typeof x === "string") : [] })),
    })),
  };
}

export async function liveUsers(f: { q?: string; roleCode?: string; status?: string }): Promise<UserRow[]> {
  const [rows, n] = await Promise.all([loadAll("/admin/users", withFilters(f)), companyNames()]);
  return rows.map((r) => toUserRow(r, n));
}

export async function liveRoles(q?: string): Promise<RoleRow[]> {
  const raw = await soft<unknown>(`/admin/roles?${withFilters({ q })}`);
  return Array.isArray(raw) ? raw.map(toRoleRow) : [];
}

export async function liveRoleOptions(): Promise<RoleOption[]> {
  return (await liveRoles()).map((r) => ({ code: r.code, name: r.name }));
}

export async function liveMatrix(f: { q?: string; domain?: string }): Promise<PermissionMatrix> {
  return toMatrix(await soft<unknown>(`/admin/role-permissions?${withFilters(f)}`));
}

export async function liveSessions(f: { q?: string; roleCode?: string }): Promise<SessionRow[]> {
  return (await loadAll("/admin/sessions", withFilters(f))).map(toSessionRow);
}

export interface AccessFigures {
  users: { total: number; active: number; suspended: number; activeSessions: number };
  sessions: { active: number; connectedUsers: number; mobile: number; latestName: string | null; latestAt: string | null };
}

/** Null counter = its source failed, so the tab shows no badge. */
export async function liveAccessSummary(q?: string): Promise<{ counts: Record<AccessTab, number | null>; figures: AccessFigures | null }> {
  const [raw, sessionHits] = await Promise.all([
    soft<unknown>(`/admin/access/summary?${withFilters({ q })}`),
    // The summary's session counter ignores the search: with a query, count the matching sessions instead.
    q ? liveSessions({ q }).then((r) => r.length).catch(() => null) : Promise.resolve<number | null>(null),
  ]);
  if (!raw || typeof raw !== "object") return { counts: { utilisateurs: null, roles: null, permissions: null, sessions: null }, figures: null };
  const o = obj(raw), c = obj(o.counts), u = obj(o.users), s = obj(o.sessions), latest = obj(s.latest);
  return {
    counts: { utilisateurs: numOrNull(c.utilisateurs), roles: numOrNull(c.roles), permissions: numOrNull(c.permissions), sessions: q && sessionHits !== null ? sessionHits : numOrNull(c.sessions) },
    figures: {
      users: { total: num(u.total), active: num(u.active), suspended: num(u.suspended), activeSessions: num(u.activeSessions) },
      sessions: { active: num(s.active), connectedUsers: num(s.connectedUsers), mobile: num(s.mobile), latestName: strOrNull(latest.displayName), latestAt: strOrNull(latest.lastSeenAt) },
    },
  };
}

// --- user detail --------------------------------------------------------------------------------------------

import { call } from "@/lib/api/sales-live";
import { ApiError } from "@/lib/api/http";
import { userNames } from "@/lib/api/comp-live";
import type { UserDetail } from "@/lib/repos/access";

/** Contact values stay masked as the platform sends them; the reveal goes through a journaled action. */
export async function liveUserDetail(id: string): Promise<UserDetail | null> {
  let raw: unknown;
  try {
    raw = await call<unknown>(`/admin/users/${encodeURIComponent(id)}`);
  } catch (e) {
    if (e instanceof ApiError && (e.status === 404 || e.status === 400)) return null;
    throw e;
  }
  const d = obj(raw);
  const [sessionsRaw, journalRaw, companies] = await Promise.all([
    soft<unknown>(`/admin/users/${encodeURIComponent(id)}/sessions`), soft<unknown>(`/admin/activity-log/users/${encodeURIComponent(id)}?limit=50`), companyNames(),
  ]);
  const u = toUserRow(d.user, companies);
  const role = obj(d.role);
  const sessions = (Array.isArray(sessionsRaw) ? sessionsRaw : []).map(toSessionRow);
  const events = Array.isArray(journalRaw) ? journalRaw.map(obj) : [];
  const actors = await userNames(events.map((e) => str(e.actorUserId)));
  return {
    user: {
      id: u.id, username: u.username, displayName: u.displayName, email: str(d.emailMasked, "••••"), phone: str(d.phoneMasked, "••••"),
      roleCode: u.roleCode, status: u.status, companyId: u.companyId, lastLoginAt: u.lastLoginAt, createdAt: str(d.createdAt),
    },
    role: str(role.code) ? { code: str(role.code), name: str(role.name, "—"), description: str(role.description) } : null,
    companyName: u.companyName, permissions: arr(d.permissions).map(toPermission), sessions,
    activeSessions: sessions.filter((s) => s.state === "active").length,
    activity: events.map((e) => ({
      id: str(e.id), companyId: strOrNull(e.companyId), at: str(e.at), actor: actors.get(str(e.actorUserId)) ?? "Système",
      action: str(e.detail) || str(e.action, "—"), userId: id,
    })),
  };
}
