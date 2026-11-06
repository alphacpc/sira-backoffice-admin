import { apiBase } from "@/lib/api/config";

export class ApiError extends Error {
  constructor(readonly status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

const TIMEOUT_MS = 15_000;

/** Server-side call to the platform. The message never carries the request body or the token. */
export async function apiCall<T>(
  path: string,
  opts: { method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"; body?: unknown; token?: string } = {},
): Promise<T> {
  const base = apiBase();
  if (!base) throw new ApiError(500, "SIRA_API_URL n'est pas défini");
  let res: Response;
  try {
    res = await fetch(`${base}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        Accept: "application/json",
        ...(opts.body !== undefined ? { "Content-Type": "application/json" } : {}),
        ...(opts.token ? { Authorization: `Bearer ${opts.token}` } : {}),
      },
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      cache: "no-store",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch {
    throw new ApiError(503, "Plateforme injoignable");
  }
  if (!res.ok) throw new ApiError(res.status, `Réponse ${res.status} de ${opts.method ?? "GET"} ${path.split("?")[0]}`);
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
