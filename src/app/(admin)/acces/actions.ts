"use server";
import { apiCall } from "@/lib/api/http";
import { isLive } from "@/lib/api/config";

import { revalidatePath } from "next/cache";
import { notWiredInLive, runLive, requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { sessionsRepo } from "@/lib/repos/access";

export async function revokeSession(sessionId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(sessionId, "Session");
      const motif = requireReason(reason);
      await apiCall(`/admin/sessions/${encodeURIComponent(sessionId)}/revoke`, { method: "POST", body: { reason: motif }, token });
      revalidatePath("/utilisateurs-acces/sessions");
      revalidatePath("/utilisateurs-acces");
    });
  }
  return run((actor) => {
    requireString(sessionId, "Session");
    const motif = requireReason(reason);
    const session = sessionsRepo.revoke(sessionId, motif, actor);
    revalidatePath("/acces/sessions");
    revalidatePath("/utilisateurs");
    revalidatePath(`/utilisateurs/${session.userId}`);
  });
}
