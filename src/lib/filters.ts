/** Keeps a query-string filter only when it is one of the allowed values. */
export function parseFilter<T extends string>(raw: string | undefined, allowed: readonly T[]): T | undefined {
  return allowed.find((value) => value === raw);
}
