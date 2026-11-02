"use server";

import { revalidatePath } from "next/cache";
import {
  requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { usersRepo } from "@/lib/repos/access";

function refreshUser(userId: string) {
  revalidatePath("/utilisateurs");
  revalidatePath(`/utilisateurs/${userId}`);
  revalidatePath("/utilisateurs-acces");
  revalidatePath("/acces/roles");
  revalidatePath("/acces/sessions");
}

export async function changeUserRole(userId: string, roleCode: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(userId, "Utilisateur");
    requireString(roleCode, "Rôle");
    const motif = requireReason(reason);
    usersRepo.changeRole(userId, roleCode, motif, actor);
    refreshUser(userId);
  });
}

export async function revokeUserSessions(userId: string, reason: string): Promise<ActionResult> {
  return run((actor) => {
    requireString(userId, "Utilisateur");
    const motif = requireReason(reason);
    usersRepo.revokeAllSessions(userId, motif, actor);
    refreshUser(userId);
  });
}

export async function revealUserContact(userId: string, field: "email" | "phone"): Promise<RevealResult> {
  return runReveal((actor) => {
    requireString(userId, "Utilisateur");
    if (field !== "email" && field !== "phone") throw new Error("Champ invalide");
    const user = usersRepo.get(userId);
    if (!user) throw new Error("Utilisateur introuvable");
    usersRepo.logReveal(userId, field, actor);
    revalidatePath(`/utilisateurs/${userId}`);
    return field === "email" ? user.email : user.phone;
  });
}
