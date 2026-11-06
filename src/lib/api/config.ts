/**
 * Live mode: set SIRA_API_URL (the nginx entry point of the platform, e.g. http://localhost:8070) and the
 * backoffice talks to the real backend. Without it, every screen keeps reading the in-memory demonstration data.
 */
export function apiBase(): string | null {
  const raw = process.env.SIRA_API_URL?.trim();
  return raw ? raw.replace(/\/+$/, "") : null;
}

export const isLive = (): boolean => apiBase() !== null;
