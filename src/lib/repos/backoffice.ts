import { truncateIp } from "@/lib/mask";
import { getStore } from "@/lib/repos/store";
import type { AdminStatus, BackofficeAdmin, BackofficeSession } from "@/lib/types";

export const ADMIN_STATUSES = ["active", "suspended", "invited"] as const;
export const JOURNAL_WINDOWS = [7, 30, 90] as const;
export const JOURNAL_LIMIT = 500;
export const RECOVERY_CODE_COUNT = 8;

const DAY = 86_400_000;
const REVEAL = /révélé/i;

export type SessionState = "active" | "revoked" | "expired";

export function backofficeSessionState(session: BackofficeSession, now: Date): SessionState {
  if (session.revokedAt !== null) return "revoked";
  return Date.parse(session.expiresAt) > now.getTime() ? "active" : "expired";
}

/** Client-safe projection of an administrator: no session, no address. */
export interface AdminRow {
  id: string; identifier: string; displayName: string; status: AdminStatus; totpEnabled: boolean;
  recoveryCodesRemaining: number; activeSessions: number; lastLoginAt: string | null; createdAt: string; isSelf: boolean;
}

/** Client-safe projection of one of my sessions: the address is truncated (`a.b.c.0`). */
export interface MySessionRow {
  id: string; deviceLabel: string; ip: string; createdAt: string; lastSeenAt: string; expiresAt: string;
  state: SessionState; current: boolean; revokedReason: string | null;
}

export interface ProfileView {
  displayName: string; identifier: string; roleLabel: string; totpEnabled: boolean; totpEnrolledAt: string | null;
  recoveryCodesRemaining: number; createdAt: string; lastLoginAt: string | null;
  /** Active sessions other than the current one. */
  otherActiveSessions: number; sessions: MySessionRow[];
}

export interface JournalRow { id: string; at: string; actor: string; action: string; companyName: string | null }
export interface JournalStats { entries7d: number; actors7d: number; reveals30d: number }

function sessionsOf(adminId: string): BackofficeSession[] {
  return getStore().backofficeSessions.filter((s) => s.adminId === adminId);
}

function adminRow(admin: BackofficeAdmin, now: Date, self: string | undefined): AdminRow {
  return {
    id: admin.id, identifier: admin.identifier, displayName: admin.displayName, status: admin.status,
    totpEnabled: admin.totpEnabled, recoveryCodesRemaining: admin.recoveryCodesRemaining,
    activeSessions: sessionsOf(admin.id).filter((s) => backofficeSessionState(s, now) === "active").length,
    lastLoginAt: admin.lastLoginAt, createdAt: admin.createdAt, isSelf: admin.identifier === self,
  };
}

export const adminsRepo = {
  listRows(filter: { status?: AdminStatus } = {}, now: Date = new Date(), self?: string): AdminRow[] {
    return getStore().backofficeAdmins
      .filter((a) => !filter.status || a.status === filter.status)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .map((a) => adminRow(a, now, self));
  },

  get(id: string): BackofficeAdmin | undefined {
    return getStore().backofficeAdmins.find((a) => a.id === id);
  },
};

export const profileRepo = {
  view(actor: string, now: Date = new Date()): ProfileView | undefined {
    const admin = getStore().backofficeAdmins.find((a) => a.identifier === actor);
    if (!admin) return undefined;
    const sessions = sessionsOf(admin.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || a.id.localeCompare(b.id))
      .map((s): MySessionRow => ({
        id: s.id, deviceLabel: s.deviceLabel, ip: truncateIp(s.ipAddress), createdAt: s.createdAt, lastSeenAt: s.lastSeenAt,
        expiresAt: s.expiresAt, state: backofficeSessionState(s, now), current: s.current, revokedReason: s.revokedReason,
      }));
    return {
      displayName: admin.displayName, identifier: admin.identifier, roleLabel: "Administrateur",
      totpEnabled: admin.totpEnabled, totpEnrolledAt: admin.totpEnrolledAt,
      recoveryCodesRemaining: admin.recoveryCodesRemaining, createdAt: admin.createdAt, lastLoginAt: admin.lastLoginAt,
      otherActiveSessions: sessions.filter((s) => !s.current && s.state === "active").length, sessions,
    };
  },
};

export const journalRepo = {
  actors(): string[] {
    return [...new Set(getStore().activity.map((e) => e.actor))].sort();
  },

  stats(now: Date = new Date()): JournalStats {
    const activity = getStore().activity;
    const since = (days: number) => now.getTime() - days * DAY;
    const week = activity.filter((e) => Date.parse(e.at) >= since(7));
    return {
      entries7d: week.length,
      actors7d: new Set(week.map((e) => e.actor)).size,
      reveals30d: activity.filter((e) => REVEAL.test(e.action) && Date.parse(e.at) >= since(30)).length,
    };
  },

  /** Newest first, at most `JOURNAL_LIMIT` entries. `days` is inclusive; a reveal is an action mentioning « révélé(e) ». */
  list(filter: { actor?: string; days?: number; revealsOnly?: boolean } = {}, now: Date = new Date()): JournalRow[] {
    const s = getStore();
    const since = filter.days ? now.getTime() - filter.days * DAY : -Infinity;
    return s.activity
      .filter((e) =>
        (!filter.actor || e.actor === filter.actor) &&
        Date.parse(e.at) >= since &&
        (!filter.revealsOnly || REVEAL.test(e.action)))
      .sort((a, b) => b.at.localeCompare(a.at) || a.id.localeCompare(b.id))
      .slice(0, JOURNAL_LIMIT)
      .map((e): JournalRow => ({
        id: e.id, at: e.at, actor: e.actor, action: e.action,
        companyName: e.companyId ? s.companies.find((c) => c.id === e.companyId)?.name ?? null : null,
      }));
  },
};
