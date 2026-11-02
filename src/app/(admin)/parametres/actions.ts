"use server";

import { revalidatePath } from "next/cache";
import { requireString, run, runValue, type ActionResult, type ValueResult } from "@/lib/actions/run";
import { adminsRepo, profileRepo, type AdminInviteInput } from "@/lib/repos/backoffice";

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

function refreshProfile() {
  revalidatePath("/parametres/profil");
  revalidatePath("/parametres/equipe-admin");
  revalidatePath("/parametres/journal-backoffice");
}

export async function updateMyDisplayName(name: string): Promise<ActionResult> {
  return run((actor) => {
    profileRepo.updateDisplayName(actor, name);
    refreshProfile();
  });
}

export async function revokeMySession(sessionId: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(sessionId, "Session");
    profileRepo.revokeSession(actor, sessionId);
    refreshProfile();
  });
}

export async function revokeMyOtherSessions(): Promise<ActionResult> {
  return run((actor) => {
    profileRepo.revokeOthers(actor);
    refreshProfile();
  });
}

/** The codes are handed back once; only their number is stored. */
export async function regenerateMyRecoveryCodes(): Promise<ValueResult<string[]>> {
  return runValue((actor) => {
    const codes = profileRepo.regenerateRecoveryCodes(actor);
    refreshProfile();
    return codes;
  });
}
