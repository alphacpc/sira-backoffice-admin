import { adminsRepo, journalRepo, profileRepo, type AdminRow, type JournalRow } from "@/lib/repos/backoffice";
import type { AdminStatus } from "@/lib/types";

export const SETTINGS_TABS = ["profil", "equipe-admin", "securite", "journal-backoffice", "preferences"] as const;
export type SettingsTab = (typeof SETTINGS_TABS)[number];
const DAY = 86_400_000;
export const IDLE_DAYS = 30;
export const LOW_CODES = 3;

export function fold(text: string): string {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}
function matcher(raw: string | undefined) {
  const q = fold((raw ?? "").trim());
  return (...fields: (string | number | null | undefined)[]) =>
    !q || fields.some((f) => f !== null && f !== undefined && fold(String(f)).includes(q));
}

export interface AdminCard extends AdminRow { idle: boolean; risks: string[] }

/** Reasons why an administrator weakens the security of the team (empty when none). */
function risksOf(a: AdminRow, now: Date): string[] {
  const risks: string[] = [];
  if (a.status === "suspended") return risks;
  if (a.status === "invited") return ["Invitation non activée"];
  if (!a.totpEnabled) risks.push("TOTP non enrôlé");
  else if (a.recoveryCodesRemaining < LOW_CODES) risks.push(`Seulement ${a.recoveryCodesRemaining} code(s) de récupération`);
  if (!a.lastLoginAt || now.getTime() - Date.parse(a.lastLoginAt) > IDLE_DAYS * DAY) risks.push(`Aucune connexion depuis plus de ${IDLE_DAYS} jours`);
  return risks;
}

export function team(q: string | undefined, status: AdminStatus | undefined, self: string, now: Date = new Date()): AdminCard[] {
  const hit = matcher(q);
  return adminsRepo.listRows({ status }, now, self)
    .map((a): AdminCard => ({ ...a, risks: risksOf(a, now), idle: !a.lastLoginAt || now.getTime() - Date.parse(a.lastLoginAt) > IDLE_DAYS * DAY }))
    .filter((a) => hit(a.displayName, a.identifier));
}

export interface SecurityPosture {
  total: number; active: number; invited: number; suspended: number;
  mfaCoverage: number | null; activeSessions: number; score: number;
  atRisk: AdminCard[]; lowCodes: number; idle: number;
}

export function posture(self: string, now: Date = new Date()): SecurityPosture {
  const all = team(undefined, undefined, self, now);
  const active = all.filter((a) => a.status === "active");
  const mfa = active.filter((a) => a.totpEnabled).length;
  const coverage = active.length ? Math.round((mfa / active.length) * 100) : null;
  const atRisk = all.filter((a) => a.risks.length > 0);
  const lowCodes = active.filter((a) => a.totpEnabled && a.recoveryCodesRemaining < LOW_CODES).length;
  const idle = active.filter((a) => a.idle).length;
  const penalty = (active.length ? ((active.length - mfa) / active.length) * 50 : 0) + (active.length ? (lowCodes / active.length) * 20 : 0) + (active.length ? (idle / active.length) * 20 : 0) + Math.min(10, all.filter((a) => a.status === "invited").length * 5);
  return {
    total: all.length, active: active.length, invited: all.filter((a) => a.status === "invited").length, suspended: all.filter((a) => a.status === "suspended").length,
    mfaCoverage: coverage, activeSessions: all.reduce((n, a) => n + a.activeSessions, 0), score: Math.max(0, Math.round(100 - penalty)),
    atRisk, lowCodes, idle,
  };
}

export interface MyChecks { items: { label: string; ok: boolean; hint: string }[]; score: number }
export function myChecks(self: string, now: Date = new Date()): MyChecks | undefined {
  const v = profileRepo.view(self, now);
  if (!v) return undefined;
  const items = [
    { label: "Authentification à deux facteurs", ok: v.totpEnabled, hint: v.totpEnabled ? "TOTP actif" : "Enrôle ton TOTP à la prochaine connexion" },
    { label: "Codes de récupération", ok: v.totpEnabled && v.recoveryCodesRemaining >= LOW_CODES, hint: `${v.recoveryCodesRemaining} restant(s)` },
    { label: "Sessions maîtrisées", ok: v.otherActiveSessions === 0, hint: v.otherActiveSessions ? `${v.otherActiveSessions} autre(s) session(s) active(s)` : "Une seule session active" },
    { label: "Connexion récente", ok: !!v.lastLoginAt && now.getTime() - Date.parse(v.lastLoginAt) <= IDLE_DAYS * DAY, hint: v.lastLoginAt ? "Compte utilisé récemment" : "Jamais connecté" },
  ];
  return { items, score: Math.round((items.filter((i) => i.ok).length / items.length) * 100) };
}

export type JournalKind = "reveal" | "suspend" | "invite" | "security" | "session" | "other";
export function journalKind(action: string): JournalKind {
  const a = fold(action);
  if (a.includes("revele")) return "reveal";
  if (a.includes("suspendu") || a.includes("reactive")) return "suspend";
  if (a.includes("invite")) return "invite";
  if (a.includes("totp") || a.includes("code")) return "security";
  if (a.includes("session")) return "session";
  return "other";
}

export function journalGroups(rows: JournalRow[], q: string | undefined): { day: string; rows: JournalRow[] }[] {
  const hit = matcher(q);
  const out = new Map<string, JournalRow[]>();
  for (const r of rows.filter((x) => hit(x.actor, x.action, x.companyName))) {
    const day = r.at.slice(0, 10);
    out.set(day, [...(out.get(day) ?? []), r]);
  }
  return [...out].map(([day, list]) => ({ day, rows: list }));
}

export function settingsCounts(q: string | undefined, self: string, now: Date = new Date()): Record<SettingsTab, number> {
  return {
    profil: profileRepo.view(self, now)?.sessions.length ?? 0,
    "equipe-admin": team(q, undefined, self, now).length,
    securite: posture(self, now).atRisk.length,
    "journal-backoffice": journalGroups(journalRepo.list({}, now), q).reduce((n, g) => n + g.rows.length, 0),
    preferences: 0,
  };
}
