/** Keeps a query-string filter only when it is one of the allowed values. */
export function parseFilter<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((value) => value === raw);
}

/**
 * Link target of a filter pill: sets `param` to `value` ("all" clears it) and keeps the other
 * filters listed in `keep` (undefined values are dropped).
 */
export function filterHref(
  basePath: string, param: string, value: string, keep: Record<string, string | undefined> = {},
): string {
  const query = new URLSearchParams();
  for (const [key, kept] of Object.entries(keep)) if (kept !== undefined && key !== param) query.set(key, kept);
  if (value !== "all") query.set(param, value);
  const qs = query.toString();
  return qs ? `${basePath}?${qs}` : basePath;
}

/** Link to a supervision page filtered on one service; the name is percent-encoded (the page validates it against the known names). */
export function serviceFilterHref(basePath: string, name: string): string {
  return `${basePath}?service=${encodeURIComponent(name)}`;
}
