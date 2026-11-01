import { getStore } from "@/lib/repos/store";
import type { ActivityEntry } from "@/lib/types";

let actCounter = 1;

/** Appends to the activity log. Callers pass labels and identifiers only, never contact data. */
export function addActivity(
  companyId: string | null, actor: string, action: string, now: Date = new Date(),
): ActivityEntry {
  const entry: ActivityEntry = {
    id: `act-${now.getTime()}-${actCounter++}`, companyId, at: now.toISOString(), actor, action,
  };
  getStore().activity.unshift(entry);
  return entry;
}
