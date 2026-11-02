"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { sessionsRepo } from "@/lib/repos/access";

export async function revokeSession(sessionId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(sessionId, "Session");
    const motif = requireReason(reason);
    const session = sessionsRepo.revoke(sessionId, motif, actor);
    revalidatePath("/acces/sessions");
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${session.userId}`);
  });
}
