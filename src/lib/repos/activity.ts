import { getStore } from "@/lib/repos/store";
import type { ActivityEntry } from "@/lib/types";

let actCounter = 1;

/**
 * Appends to the activity log. Callers pass labels and identifiers only, never contact data.
 * `userId` ties the entry to a platform account (shown on that account's activity tab).
 */
export function addActivity(
  companyId: string | null, actor: string, action: string, now: Date = new Date(), userId?: string,
): ActivityEntry {
  const entry: ActivityEntry = {
    id: `act-${now.getTime()}-${actCounter++}`, companyId, at: now.toISOString(), actor, action,
    ...(userId ? { userId } : {}),
  };
  getStore().activity.unshift(entry);
  return entry;
}
