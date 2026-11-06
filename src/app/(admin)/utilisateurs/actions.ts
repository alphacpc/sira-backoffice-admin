"use server";
import { isLive } from "@/lib/api/config";
import { apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";

import { revalidatePath } from "next/cache";
import {
  notWiredInLive, runLive, requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
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
  if (isLive()) {
    return runLive(async (token) => {
      requireString(userId, "Utilisateur");
      requireString(roleCode, "Rôle");
      const motif = requireReason(reason);
      const roles = await apiCall<{ id: string; code: string }[]>("/admin/roles", { token });
      const role = (Array.isArray(roles) ? roles : []).find((r) => r.code === roleCode);
      if (!role) throw new Error("Rôle inconnu");
      await apiCall(`/admin/users/${encodeURIComponent(userId)}/role`, { method: "PATCH", body: { roleId: role.id, reason: motif }, token });
      refreshUser(userId);
    });
  }
  return run((actor) => {
    requireString(userId, "Utilisateur");
    requireString(roleCode, "Rôle");
    const motif = requireReason(reason);
    usersRepo.changeRole(userId, roleCode, motif, actor);
    refreshUser(userId);
  });
}

export async function revokeUserSessions(userId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(userId, "Utilisateur");
      const motif = requireReason(reason);
      await apiCall(`/admin/users/${encodeURIComponent(userId)}/sessions/revoke`, { method: "POST", body: { reason: motif }, token });
      refreshUser(userId);
    });
  }
  return run((actor) => {
    requireString(userId, "Utilisateur");
    const motif = requireReason(reason);
    usersRepo.revokeAllSessions(userId, motif, actor);
    refreshUser(userId);
  });
}

export async function revealUserContact(userId: string, field: "email" | "phone"): Promise<RevealResult> {
  if (isLive()) {
    try {
      requireString(userId, "Utilisateur");
      if (field !== "email" && field !== "phone") return { ok: false, error: "Champ invalide" };
      const token = await currentBackendToken();
      const res = await apiCall<{ value?: string }>(`/admin/users/${encodeURIComponent(userId)}/reveal`, { method: "POST", body: { field }, token });
      return typeof res?.value === "string" ? { ok: true, value: res.value } : { ok: false, error: "Valeur indisponible" };
    } catch {
      return { ok: false, error: "Impossible de révéler cette valeur pour le moment." };
    }
  }
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
