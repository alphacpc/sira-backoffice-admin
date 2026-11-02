import { truncateIp } from "@/lib/mask";
import { addActivity } from "@/lib/repos/activity";
import { getStore } from "@/lib/repos/store";
import { checkReason } from "@/lib/validation";
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

export interface AdminInviteInput { identifier: string; displayName: string }

const IDENTIFIER_FORMAT = /^[a-z0-9._-]{3,40}@sira\.app$/;
const MAX_NAME = 100;
let boSeq = 1;

function requireMotif(reason: string): string {
  return checkReason(reason, "Un motif est obligatoire", "Motif invalide");
}

/** Team-journal entry: tagged so the Vue 360 recent activity leaves it out. */
function journal(actor: string, action: string, now: Date): void {
  addActivity(null, actor, action, now).scope = "backoffice";
}

function requireAdmin(id: string): BackofficeAdmin {
  const admin = getStore().backofficeAdmins.find((a) => a.id === id);
  if (!admin) throw new Error("Administrateur introuvable");
  return admin;
}

function activeSessionsOf(adminId: string, now: Date): BackofficeSession[] {
  return sessionsOf(adminId).filter((s) => backofficeSessionState(s, now) === "active");
}

function revokeAll(sessions: BackofficeSession[], reason: string, now: Date): number {
  for (const s of sessions) { s.revokedAt = now.toISOString(); s.revokedReason = reason; }
  return sessions.length;
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

  /** Invites an administrator. Guards, in this order: identifier present, well formed, name, identifier free. */
  invite(input: AdminInviteInput, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const s = getStore();
    if (typeof input?.identifier !== "string") throw new Error("L'identifiant est obligatoire");
    const identifier = input.identifier.trim().toLowerCase();
    if (!identifier) throw new Error("L'identifiant est obligatoire");
    if (!IDENTIFIER_FORMAT.test(identifier)) throw new Error("L'identifiant doit avoir la forme prenom.nom@sira.app");
    if (typeof input.displayName !== "string") throw new Error("Le nom est obligatoire");
    const displayName = input.displayName.trim();
    if (!displayName) throw new Error("Le nom est obligatoire");
    if (displayName.length > MAX_NAME) throw new Error("Le nom est trop long (100 caractères maximum)");
    if (s.backofficeAdmins.some((a) => a.identifier === identifier)) throw new Error("Cet identifiant existe déjà");
    const admin: BackofficeAdmin = {
      id: `bo-admin-${now.getTime()}-${boSeq++}`, identifier, displayName, status: "invited", totpEnabled: false,
      totpEnrolledAt: null, recoveryCodesRemaining: 0, lastLoginAt: null, createdAt: now.toISOString(),
    };
    s.backofficeAdmins.push(admin);
    journal(actor, `Administrateur invité : ${identifier}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, not oneself, active, not the last active one. */
  suspend(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const s = getStore();
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.identifier === actor) throw new Error("Impossible de suspendre son propre compte");
    if (admin.status !== "active") throw new Error("Le compte n'est pas actif");
    if (s.backofficeAdmins.filter((a) => a.status === "active").length === 1) {
      throw new Error("Impossible de suspendre le dernier administrateur actif");
    }
    admin.status = "suspended";
    const revoked = revokeAll(activeSessionsOf(admin.id, now), "Compte suspendu", now);
    journal(actor, `Administrateur ${admin.identifier} suspendu (${revoked} session(s) révoquée(s)). Motif : ${motif}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, suspended. Sessions are not restored. */
  reactivate(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.status !== "suspended") throw new Error("Le compte n'est pas suspendu");
    admin.status = "active";
    journal(actor, `Administrateur ${admin.identifier} réactivé. Motif : ${motif}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, not oneself, active, TOTP enabled. */
  resetTotp(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): BackofficeAdmin {
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.identifier === actor) throw new Error("Impossible de réinitialiser son propre TOTP");
    if (admin.status !== "active") throw new Error("Le compte n'est pas actif");
    if (!admin.totpEnabled) throw new Error("Aucun TOTP à réinitialiser");
    admin.totpEnabled = false;
    admin.totpEnrolledAt = null;
    admin.recoveryCodesRemaining = 0;
    const revoked = revokeAll(activeSessionsOf(admin.id, now), "TOTP réinitialisé", now);
    journal(actor, `TOTP de ${admin.identifier} réinitialisé (${revoked} session(s) révoquée(s)). Motif : ${motif}`, now);
    return admin;
  },

  /** Guards, in this order: exists, motif, not oneself, at least one active session. */
  revokeSessions(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): number {
    const admin = requireAdmin(id);
    const motif = requireMotif(reason);
    if (admin.identifier === actor) throw new Error("Pour tes propres sessions, utilise ton profil");
    const active = activeSessionsOf(admin.id, now);
    if (active.length === 0) throw new Error("Aucune session active à révoquer");
    revokeAll(active, motif, now);
    journal(actor, `${active.length} session(s) de ${admin.identifier} révoquée(s). Motif : ${motif}`, now);
    return active.length;
  },
};

function selfOf(actor: string): BackofficeAdmin {
  const admin = getStore().backofficeAdmins.find((a) => a.identifier === actor);
  if (!admin) throw new Error("Compte introuvable");
  return admin;
}

function newRecoveryCode(): string {
  const hex = crypto.randomUUID().replace(/-/g, "").slice(0, 8).toUpperCase();
  return `${hex.slice(0, 4)}-${hex.slice(4)}`;
}

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

  /** Guards, in this order: my account, name is a string, present, at most 100 characters. */
  updateDisplayName(actor: string, name: string, now: Date = new Date()): BackofficeAdmin {
    const admin = selfOf(actor);
    if (typeof name !== "string") throw new Error("Nom invalide");
    const displayName = name.trim();
    if (!displayName) throw new Error("Le nom est obligatoire");
    if (displayName.length > MAX_NAME) throw new Error("Le nom est trop long (100 caractères maximum)");
    admin.displayName = displayName;
    journal(actor, `Nom affiché de ${admin.identifier} modifié`, now);
    return admin;
  },

  /** Guards, in this order: my account, one of my sessions, not the current one, still active. No motif for one's own session. */
  revokeSession(actor: string, sessionId: string, now: Date = new Date()): BackofficeSession {
    const admin = selfOf(actor);
    const session = sessionsOf(admin.id).find((s) => s.id === sessionId);
    if (!session) throw new Error("Session introuvable");
    if (session.current) throw new Error("Utilise la déconnexion pour fermer la session courante");
    if (backofficeSessionState(session, now) !== "active") throw new Error("La session est déjà révoquée ou expirée");
    revokeAll([session], "Révoquée par le titulaire", now);
    journal(actor, `Session révoquée (${session.deviceLabel})`, now);
    return session;
  },

  /** Guards, in this order: my account, at least one other active session. The current session stays. */
  revokeOthers(actor: string, now: Date = new Date()): number {
    const admin = selfOf(actor);
    const others = activeSessionsOf(admin.id, now).filter((s) => !s.current);
    if (others.length === 0) throw new Error("Aucune autre session active");
    revokeAll(others, "Révoquée par le titulaire", now);
    journal(actor, `${others.length} autre(s) session(s) révoquée(s)`, now);
    return others.length;
  },

  /** Guards, in this order: my account, TOTP enabled. Returns the new codes once; only their number is kept. */
  regenerateRecoveryCodes(actor: string, now: Date = new Date()): string[] {
    const admin = selfOf(actor);
    if (!admin.totpEnabled) throw new Error("Le TOTP n'est pas activé");
    const codes = new Set<string>();
    while (codes.size < RECOVERY_CODE_COUNT) codes.add(newRecoveryCode());
    admin.recoveryCodesRemaining = RECOVERY_CODE_COUNT;
    journal(actor, "Codes de récupération régénérés", now);
    return [...codes];
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
