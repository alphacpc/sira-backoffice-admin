"use server";

import { revalidatePath } from "next/cache";
import { isLive } from "@/lib/api/config";
import { apiCall } from "@/lib/api/http";
import { notWiredInLive, runLive, requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { busesRepo } from "@/lib/repos/fleet";

export async function retireBus(busId: string, reason: string): Promise<ActionResult> {
  if (isLive()) {
    return runLive(async (token) => {
      requireString(busId, "Bus");
      const motif = requireReason(reason);
      await apiCall(`/admin/fleet/buses/${encodeURIComponent(busId)}/retire`, { method: "POST", body: { reason: motif }, token });
      revalidatePath("/flotte/bus");
      revalidatePath(`/flotte/bus/${busId}`);
    });
  }
  return run((actor) => {
    requireString(busId, "Bus");
    const motif = requireReason(reason);
    const bus = busesRepo.retire(busId, motif, actor);
    revalidatePath("/");
    revalidatePath("/flotte/bus");
    revalidatePath(`/flotte/bus/${bus.id}`);
    revalidatePath(`/compagnies/${bus.companyId}`);
  });
}
