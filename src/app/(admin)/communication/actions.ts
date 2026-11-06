"use server";
import { isLive } from "@/lib/api/config";
import { apiCall } from "@/lib/api/http";

import { revalidatePath } from "next/cache";
import {
  notWiredInLive, runLive, requireReason, requireString, run, runReveal, type ActionResult, type RevealResult,
} from "@/lib/actions/run";
import { campaignsRepo, notificationsRepo, schedulesRepo } from "@/lib/repos/communication";

export async function cancelCampaign(campaignId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(campaignId, "Campagne");
      const motif = requireReason(reason);
      await apiCall(`/admin/marketing-campaigns/${encodeURIComponent(campaignId)}/cancel`, { method: "PATCH", body: { reason: motif }, token });
      revalidatePath("/communication/campagnes");
      revalidatePath(`/communication/campagnes/${campaignId}`);
      revalidatePath("/communication/programmations");
    });
  }
  return run((actor) => {
    requireString(campaignId, "Campagne");
    const motif = requireReason(reason);
    const campaign = campaignsRepo.cancel(campaignId, motif, actor);
    revalidatePath("/communication/campagnes");
    revalidatePath(`/communication/campagnes/${campaign.id}`);
    revalidatePath("/communication/programmations");
    revalidatePath(`/compagnies/${campaign.companyId}`);
  });
}

export async function cancelSchedule(scheduleId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(scheduleId, "Programmation");
      const motif = requireReason(reason);
      await apiCall(`/admin/marketing-schedules/${encodeURIComponent(scheduleId)}/cancel`, { method: "PATCH", body: { reason: motif }, token });
      revalidatePath("/communication/programmations");
    });
  }
  return run((actor) => {
    requireString(scheduleId, "Programmation");
    const motif = requireReason(reason);
    const schedule = schedulesRepo.cancel(scheduleId, motif, actor);
    revalidatePath("/communication/programmations");
    revalidatePath(`/communication/campagnes/${schedule.campaignId}`);
    revalidatePath(`/compagnies/${schedule.companyId}`);
  });
}

export async function revealNotificationContent(notificationId: string): Promise<RevealResult> {
  const notWired = await notWiredInLive();
  if (notWired && !notWired.ok) return notWired;
  return runReveal((actor) => {
    requireString(notificationId, "Notification");
    const notification = notificationsRepo.get(notificationId);
    if (!notification) throw new Error("Notification introuvable");
    notificationsRepo.logReveal(notificationId, actor);
    revalidatePath(`/communication/notifications/${notificationId}`);
    revalidatePath(`/compagnies/${notification.companyId}`);
    return notification.messageContent;
  });
}
