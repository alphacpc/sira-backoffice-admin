import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import { cancelCampaign, cancelSchedule, revealNotificationContent } from "@/app/(admin)/communication/actions";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };
const EXPIRED = { ok: false, error: "Session expirée, reconnecte-toi" };
beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const campaignNamed = (name: string) => getStore().marketingCampaigns.find((c) => c.name === name)!;
const pendingScheduleOf = (name: string) =>
  getStore().marketingSchedules.find((s) => s.campaignId === campaignNamed(name).id && s.status === "PENDING")!;
const paths = () => revalidatePath.mock.calls.map((c) => c[0] as string);

describe("cancelCampaign", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = campaignNamed("Offre de la Tabaski");
    const n = getStore().activity.length;
    expect(await cancelCampaign(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("SCHEDULED");
    expect(pendingScheduleOf("Offre de la Tabaski").status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("cancels the campaign and its pending schedule, journals the actor and revalidates the affected pages", async () => {
    const target = campaignNamed("Offre de la Tabaski");
    expect(await cancelCampaign(target.id, " Offre retirée ")).toEqual({ ok: true });
    expect(target.status).toBe("CANCELLED");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    expect(paths()).toEqual(expect.arrayContaining([
      "/communication/campagnes", `/communication/campagnes/${target.id}`, "/communication/programmations",
      `/compagnies/${target.companyId}`,
    ]));
  });

  it("accepts a reason of exactly 500 characters and refuses 501 without changing anything", async () => {
    const target = campaignNamed("Offre de la Tabaski");
    expect(await cancelCampaign(target.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    expect(target.status).toBe("SCHEDULED");
    expect(await cancelCampaign(target.id, "x".repeat(500))).toEqual({ ok: true });
  });

  it("returns the rule's message as an error result", async () => {
    expect(await cancelCampaign(campaignNamed("Bilan de rentrée").id, "motif")).toEqual({
      ok: false, error: "Une campagne en cours ou terminée ne peut pas être annulée",
    });
    expect(await cancelCampaign(campaignNamed("Campagne d'été annulée").id, "motif")).toEqual({
      ok: false, error: "Cette campagne est déjà annulée",
    });
    expect(await cancelCampaign("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Campagne introuvable" });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("refuses a blank id or a blank reason", async () => {
    expect((await cancelCampaign("", "motif")).ok).toBe(false);
    expect((await cancelCampaign(campaignNamed("Offre de la Tabaski").id, "  ")).ok).toBe(false);
    expect(campaignNamed("Offre de la Tabaski").status).toBe("SCHEDULED");
  });
});

describe("cancelSchedule", () => {
  it("reads and writes nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const target = pendingScheduleOf("Offre de fin d'année");
    expect(await cancelSchedule(target.id, "motif")).toEqual(EXPIRED);
    expect(target.status).toBe("PENDING");
  });

  it("cancels the schedule, journals the actor and revalidates the affected pages", async () => {
    const target = pendingScheduleOf("Offre de fin d'année");
    expect(await cancelSchedule(target.id, "Date incorrecte")).toEqual({ ok: true });
    expect(target.status).toBe("CANCELLED");
    expect(getStore().activity[0]).toMatchObject({ actor: "tester@sira.app", companyId: target.companyId });
    expect(paths()).toEqual(expect.arrayContaining([
      "/communication/programmations", `/communication/campagnes/${target.campaignId}`, `/compagnies/${target.companyId}`,
    ]));
  });

  it("refuses 501 characters, an already sent schedule, an unknown one and blank input", async () => {
    const pending = pendingScheduleOf("Offre de fin d'année");
    expect(await cancelSchedule(pending.id, "x".repeat(501))).toEqual({ ok: false, error: "Motif trop long (500 caractères maximum)" });
    const sent = getStore().marketingSchedules.find((s) => s.status === "SENT")!;
    expect(await cancelSchedule(sent.id, "motif")).toEqual({ ok: false, error: "Cette programmation n'est plus en attente" });
    expect(await cancelSchedule("00000000-0000-4000-8000-000000000000", "motif")).toEqual({ ok: false, error: "Programmation introuvable" });
    expect((await cancelSchedule("", "motif")).ok).toBe(false);
    expect((await cancelSchedule(pending.id, "  ")).ok).toBe(false);
    expect(pending.status).toBe("PENDING");
    expect(sent.status).toBe("SENT");
  });
});

describe("revealNotificationContent", () => {
  it("returns no value and logs nothing without a session", async () => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
    const n = getStore().activity.length;
    expect(await revealNotificationContent(getStore().notifications[0]!.id)).toEqual(EXPIRED);
    expect(getStore().activity).toHaveLength(n);
  });

  it("returns the content only after journaling the reveal, by the session actor", async () => {
    const target = getStore().notifications.find((x) => x.entityType === "booking")!;
    const n = getStore().activity.length;
    expect(await revealNotificationContent(target.id)).toEqual({ ok: true, value: target.messageContent });
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      actor: "tester@sira.app", companyId: target.companyId,
      action: `Donnée personnelle révélée : contenu de la notification ${target.notificationCode}`,
    });
    expect(paths()).toContain(`/communication/notifications/${target.id}`);
  });

  it("refuses an unknown or blank notification without logging", async () => {
    const n = getStore().activity.length;
    expect(await revealNotificationContent("00000000-0000-4000-8000-000000000000")).toEqual({ ok: false, error: "Notification introuvable" });
    expect(await revealNotificationContent("")).toEqual({ ok: false, error: "Notification invalide" });
    expect(getStore().activity).toHaveLength(n);
  });
});
