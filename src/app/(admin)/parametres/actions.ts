"use server";

import { revalidatePath } from "next/cache";
import { requireString, run, type ActionResult } from "@/lib/actions/run";
import { adminsRepo, type AdminInviteInput } from "@/lib/repos/backoffice";

function refreshTeam() {
  revalidatePath("/parametres/equipe-admin");
  revalidatePath("/parametres/journal-backoffice");
}

export async function inviteAdmin(input: AdminInviteInput): Promise<ActionResult> {
  return run((actor) => {
    adminsRepo.invite(input, actor);
    refreshTeam();
  });
}

export async function suspendAdmin(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.suspend(adminId, reason, actor);
    refreshTeam();
  });
}

export async function reactivateAdmin(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.reactivate(adminId, reason, actor);
    refreshTeam();
  });
}

export async function resetAdminTotp(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.resetTotp(adminId, reason, actor);
    refreshTeam();
  });
}

export async function revokeAdminSessions(adminId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(adminId, "Administrateur");
    adminsRepo.revokeSessions(adminId, reason, actor);
    refreshTeam();
  });
}
