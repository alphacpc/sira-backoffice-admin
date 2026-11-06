import { backendToken } from "@/lib/api/backend-session";
import { requireSession } from "@/lib/auth/session";

/** Platform access token of the signed-in administrator (refreshed when needed). Server side only. */
export async function currentBackendToken(): Promise<string> {
  const session = await requireSession();
  return backendToken(session.sid);
}
