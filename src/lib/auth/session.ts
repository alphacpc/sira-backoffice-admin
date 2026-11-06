import { isLive } from "@/lib/api/config";
import { cookies } from "next/headers";
import { DEMO_ID, SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken, type TokenPayload } from "@/lib/auth/token";

export async function requireSession(): Promise<TokenPayload> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (!payload || payload.stage !== "full") throw new Error("Non authentifié");
  return payload;
}

/** The backoffice has a single administrator level: only that account may overwrite a submitted file. */
export async function isBackofficeAdmin(): Promise<boolean> {
  try {
    const session = await requireSession();
    // Live: any full session is the administrator; the demonstration compares the account id.
    return isLive() || session.sub === DEMO_ID;
  } catch {
    return false;
  }
}
