import { randomUUID } from "node:crypto";
import { ApiError, apiCall } from "@/lib/api/http";

/**
 * The browser only ever holds an opaque session id: the platform's access and refresh tokens stay on the server.
 * The store is in memory (one process): a restart signs everyone out, which sends them to « session expirée ».
 */
interface Entry { access: string; refresh: string }
const g = globalThis as unknown as { __siraBackendSessions?: Map<string, Entry> };
const store = (): Map<string, Entry> => (g.__siraBackendSessions ??= new Map());

const REFRESH_MARGIN_MS = 60_000;

function expiryMs(jwt: string): number {
  try {
    const part = jwt.split(".")[1] ?? "";
    const json = Buffer.from(part.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
    const exp = (JSON.parse(json) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : 0;
  } catch {
    return 0;
  }
}

export function openBackendSession(tokens: { accessToken: string; refreshToken: string }): string {
  const sid = randomUUID();
  store().set(sid, { access: tokens.accessToken, refresh: tokens.refreshToken });
  return sid;
}

export async function closeBackendSession(sid: string | undefined): Promise<void> {
  const entry = sid ? store().get(sid) : undefined;
  if (!sid || !entry) return;
  store().delete(sid);
  try {
    await apiCall("/admin/auth/logout", { method: "POST", body: { refreshToken: entry.refresh, reason: "logout" } });
  } catch {
    // The server-side copy is gone either way.
  }
}

/** A valid access token for this session, refreshed when it is about to expire. */
export async function backendToken(sid: string | undefined): Promise<string> {
  const entry = sid ? store().get(sid) : undefined;
  if (!sid || !entry) throw new ApiError(401, "Session de la plateforme introuvable");
  if (expiryMs(entry.access) - Date.now() > REFRESH_MARGIN_MS) return entry.access;
  try {
    const next = await apiCall<{ accessToken: string; refreshToken?: string }>("/admin/auth/refresh", {
      method: "POST", body: { refreshToken: entry.refresh },
    });
    entry.access = next.accessToken;
    if (next.refreshToken) entry.refresh = next.refreshToken;
    return entry.access;
  } catch {
    store().delete(sid);
    throw new ApiError(401, "Session de la plateforme expirée");
  }
}
