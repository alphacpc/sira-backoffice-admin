import { requireSession } from "@/lib/auth/session";

export type ActionResult = { ok: true } | { ok: false; error: string };

export const MAX_REASON = 500;
export const REASON_TOO_LONG = "Motif trop long (500 caractères maximum)";
export const SESSION_EXPIRED = "Session expirée, reconnecte-toi";

export function requireString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") throw new Error(`${label} invalide`);
  return value;
}

/** A mandatory reason: trimmed, at most 500 characters. */
export function requireReason(value: unknown): string {
  const reason = requireString(value, "Motif").trim();
  if (reason.length > MAX_REASON) throw new Error(REASON_TOO_LONG);
  return reason;
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
