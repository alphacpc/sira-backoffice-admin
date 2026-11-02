export const MAX_REASON = 500;
export const REASON_TOO_LONG = "Motif trop long (500 caractères maximum)";

/**
 * A mandatory reason: a string, trimmed, non-empty, at most 500 characters.
 * `blankMessage` is the call-site specific error for a missing or blank value.
 */
export function checkReason(value: unknown, blankMessage: string, nonStringMessage = blankMessage): string {
  if (typeof value !== "string") throw new Error(nonStringMessage);
  const reason = value.trim();
  if (!reason) throw new Error(blankMessage);
  if (reason.length > MAX_REASON) throw new Error(REASON_TOO_LONG);
  return reason;
}
