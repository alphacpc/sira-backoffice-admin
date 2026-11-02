"use server";

import { revalidatePath } from "next/cache";
import { requireReason, requireString, run, type ActionResult } from "@/lib/actions/run";
import { busesRepo } from "@/lib/repos/fleet";

export async function retireBus(busId: string, reason: string): Promise<ActionResult> {
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
