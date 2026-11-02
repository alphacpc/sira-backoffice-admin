import { beforeEach, describe, expect, it } from "vitest";
import { campaignsRepo, notificationsRepo, schedulesRepo } from "@/lib/repos/communication";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const campaignNamed = (name: string) => getStore().marketingCampaigns.find((c) => c.name === name)!;
const schedulesOf = (campaignId: string) => getStore().marketingSchedules.filter((s) => s.campaignId === campaignId);
const cancelCampaign = (name: string, reason = "Offre retirée") =>
  campaignsRepo.cancel(campaignNamed(name).id, reason, "tester@sira.app", NOW);
const pendingScheduleOf = (name: string) => schedulesOf(campaignNamed(name).id).find((s) => s.status === "PENDING")!;

describe("cancelling a campaign", () => {
  it("cancels it, cascades to its pending schedules only, and journals the count", () => {
    const target = campaignNamed("Offre de la Tabaski");
    const [sent, pending] = [
      schedulesOf(target.id).find((s) => s.status === "SENT")!, schedulesOf(target.id).find((s) => s.status === "PENDING")!,
    ];
    const n = getStore().activity.length;
    const result = cancelCampaign("Offre de la Tabaski", "  Offre retirée  ");
    expect(result).toBe(target);
    expect(target.status).toBe("CANCELLED");
    expect(target.updatedAt).toBe(NOW.toISOString());
    expect(pending.status).toBe("CANCELLED");
    expect(sent.status).toBe("SENT");
    expect(sent.sentAt).not.toBeNull();
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: "Campagne « Offre de la Tabaski » annulée (1 programmation(s) annulée(s)). Motif : Offre retirée",
    });
  });

  it("does not touch the schedules of other campaigns", () => {
    const other = campaignNamed("Offre de fin d'année");
    cancelCampaign("Offre de la Tabaski");
    expect(other.status).toBe("SCHEDULED");
    expect(pendingScheduleOf("Offre de fin d'année").status).toBe("PENDING");
  });

  it("cancels a draft campaign with no schedule and reports zero", () => {
    const draft = getStore().marketingCampaigns.find((c) => c.status === "DRAFT")!;
    const n = getStore().activity.length;
    campaignsRepo.cancel(draft.id, "Abandonnée", "tester@sira.app", NOW);
    expect(draft.status).toBe("CANCELLED");
    expect(getStore().activity[0]!.action).toBe(`Campagne « ${draft.name} » annulée (0 programmation(s) annulée(s)). Motif : Abandonnée`);
    expect(getStore().activity).toHaveLength(n + 1);
  });

  it("refuses an unknown campaign", () => {
    expect(() => campaignsRepo.cancel("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Campagne introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = campaignNamed("Offre de la Tabaski");
    const n = getStore().activity.length;
    expect(() => cancelCampaign("Offre de la Tabaski", "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("SCHEDULED");
    expect(pendingScheduleOf("Offre de la Tabaski").status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a campaign that is already cancelled", () => {
    expect(() => cancelCampaign("Campagne d'été annulée")).toThrow("Cette campagne est déjà annulée");
  });

  it("refuses a completed campaign and leaves its schedule untouched", () => {
    const done = campaignNamed("Bilan de rentrée");
    expect(() => cancelCampaign("Bilan de rentrée")).toThrow("Une campagne en cours ou terminée ne peut pas être annulée");
    expect(done.status).toBe("COMPLETED");
    expect(schedulesOf(done.id).map((s) => s.status)).toEqual(["SENT"]);
  });

  it("refuses a running campaign", () => {
    const target = campaignNamed("Offre de la Tabaski");
    target.status = "RUNNING";
    expect(() => cancelCampaign("Offre de la Tabaski")).toThrow("Une campagne en cours ou terminée ne peut pas être annulée");
    expect(pendingScheduleOf("Offre de la Tabaski").status).toBe("PENDING");
  });

  it("checks the guards in order: unknown, reason, already cancelled, running or completed", () => {
    expect(() => cancelCampaign("Campagne d'été annulée", "")).toThrow("Un motif est obligatoire");
    expect(() => cancelCampaign("Bilan de rentrée", "")).toThrow("Un motif est obligatoire");
    const target = campaignNamed("Bilan de rentrée");
    target.status = "CANCELLED";
    expect(() => cancelCampaign("Bilan de rentrée")).toThrow("Cette campagne est déjà annulée");
  });
});

describe("cancelling a schedule", () => {
  it("cancels a pending schedule, keeps its campaign and journals it", () => {
    const target = pendingScheduleOf("Offre de fin d'année");
    const campaign = campaignNamed("Offre de fin d'année");
    const n = getStore().activity.length;
    const result = schedulesRepo.cancel(target.id, "  Date incorrecte  ", "tester@sira.app", NOW);
    expect(result).toBe(target);
    expect(target.status).toBe("CANCELLED");
    expect(campaign.status).toBe("SCHEDULED");
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: "Programmation de la campagne « Offre de fin d'année » annulée. Motif : Date incorrecte",
    });
  });

  it("refuses an unknown schedule", () => {
    expect(() => schedulesRepo.cancel("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Programmation introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = pendingScheduleOf("Offre de fin d'année");
    const n = getStore().activity.length;
    expect(() => schedulesRepo.cancel(target.id, "  ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a schedule that is no longer pending, whatever its status", () => {
    const sent = schedulesOf(campaignNamed("Bilan de rentrée").id)[0]!;
    expect(() => schedulesRepo.cancel(sent.id, "motif")).toThrow("Cette programmation n'est plus en attente");
    expect(sent.status).toBe("SENT");
    const cancelled = getStore().marketingSchedules.find((s) => s.status === "CANCELLED")!;
    expect(() => schedulesRepo.cancel(cancelled.id, "motif")).toThrow("Cette programmation n'est plus en attente");
    const failed = pendingScheduleOf("Offre de fin d'année");
    failed.status = "FAILED";
    expect(() => schedulesRepo.cancel(failed.id, "motif")).toThrow("Cette programmation n'est plus en attente");
  });

  it("checks the reason before the status", () => {
    const sent = schedulesOf(campaignNamed("Bilan de rentrée").id)[0]!;
    expect(() => schedulesRepo.cancel(sent.id, "")).toThrow("Un motif est obligatoire");
  });
});

describe("revealing a notification's content", () => {
  it("journals the reveal on the notification's company without writing the content", () => {
    const target = getStore().notifications.find((n) => n.entityType === "booking")!;
    const n = getStore().activity.length;
    notificationsRepo.logReveal(target.id, "tester@sira.app", NOW);
    expect(getStore().activity).toHaveLength(n + 1);
    const entry = getStore().activity[0]!;
    expect(entry).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Donnée personnelle révélée : contenu de la notification ${target.notificationCode}`,
    });
    expect(entry.action).not.toContain(target.messageContent);
  });

  it("refuses an unknown notification without journaling", () => {
    const n = getStore().activity.length;
    expect(() => notificationsRepo.logReveal("00000000-0000-4000-8000-000000000000")).toThrow("Notification introuvable");
    expect(getStore().activity).toHaveLength(n);
  });
});
