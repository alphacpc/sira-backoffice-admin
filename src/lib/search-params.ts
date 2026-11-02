/** A search param as a single string; a repeated param (`?q=a&q=b`) or a missing one counts as absent. */
export function firstString(value: string | string[] | undefined): string | undefined {
  return typeof value === "string" ? value : undefined;
}
