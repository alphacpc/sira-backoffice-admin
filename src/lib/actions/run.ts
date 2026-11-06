import { isLive } from "@/lib/api/config";
import { ApiError } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";
import { requireSession } from "@/lib/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

import { checkReason } from "@/lib/validation";

export { MAX_REASON, REASON_TOO_LONG } from "@/lib/validation";
export const SESSION_EXPIRED = "Session expirée, reconnecte-toi";

export function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} invalide`);
  return value;
}

/** A mandatory reason: trimmed, at most 500 characters. */
export function requireReason(value: unknown): string {
  return checkReason(value, "Motif invalide");
}

export function errorMessage(e: unknown): string {
  return e instanceof Error && e.message ? e.message : "Action impossible";
}

/**
 * Server actions are public HTTP endpoints: the session is checked before the body
 * reads or writes anything, and expected failures come back as `{ ok: false }`
 * (production masks the message of a thrown error).
 */
export async function run(body: (actor: string) => void): Promise<ActionResult> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    body(actor);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export type RevealResult = { ok: true; value: string } | { ok: false; error: string };

/**
 * Same contract as `run` for an action that hands back one personal value: the session is
 * checked first, and the value only leaves the server when the body (which journals the reveal) succeeds.
 */
export async function runReveal(body: (actor: string) => string): Promise<RevealResult> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    return { ok: true, value: body(actor) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export type ValueResult<T> = { ok: true; value: T } | { ok: false; error: string };

/**
 * Same contract as `runReveal` for an action that hands back a structured value (the body journals what it needs
 * before returning): the session is checked first, and the value only leaves the server when the body succeeds.
 */
export async function runValue<T>(body: (actor: string) => T): Promise<ValueResult<T>> {
  let actor: string;
  try {
    actor = (await requireSession()).sub;
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    return { ok: true, value: body(actor) };
  } catch (e) {
    return { ok: false, error: errorMessage(e) };
  }
}

export const NOT_WIRED = "Cette action n'est pas encore branchée à la plateforme.";

/**
 * Live mode: the write actions are not wired to the platform yet, so they must not touch the demonstration store.
 * Returns the result to hand back (session checked first), or null in demonstration mode.
 */
export async function notWiredInLive(): Promise<ActionResult | null> {
  if (!isLive()) return null;
  try {
    await requireSession();
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  return { ok: false, error: NOT_WIRED };
}

const LIVE_REFUSALS: Record<number, string> = {
  400: "La plateforme a refusé la demande (vérifie le motif et les champs).",
  403: "Action non autorisée pour ce compte.",
  404: "Élément introuvable.",
  409: "L'état actuel ne permet pas cette action.",
};

/**
 * Live counterpart of `run`: the session is checked first, then the body talks to the platform with the
 * administrator's token. A refusal comes back as `{ ok: false }` with a plain message (never the raw response).
 */
export async function runLive(body: (token: string, actor: string) => Promise<void>): Promise<ActionResult> {
  let actor: string;
  let token: string;
  try {
    actor = (await requireSession()).sub;
    token = await currentBackendToken();
  } catch {
    return { ok: false, error: SESSION_EXPIRED };
  }
  try {
    await body(token, actor);
    return { ok: true };
  } catch (e) {
    if (e instanceof ApiError) {
      if (e.status === 401) return { ok: false, error: SESSION_EXPIRED };
      return { ok: false, error: LIVE_REFUSALS[e.status] ?? "La plateforme est indisponible, réessaie dans un instant." };
    }
    return { ok: false, error: errorMessage(e) };
  }
}
