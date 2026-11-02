import { beforeEach, describe, expect, it } from "vitest";
import { feedbackRepo } from "@/lib/repos/clients";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const titled = (title: string) => getStore().feedbacks.find((f) => f.title === title)!;
const PENDING_TITLE = "Climatisation en panne pendant le trajet";
const RESOLVED_TITLE = "Service impeccable au guichet";
const ignore = (title: string, reason = "Propos injurieux") =>
  feedbackRepo.ignore(titled(title).id, reason, "tester@sira.app", NOW);

describe("ignoring a review", () => {
  it("ignores a pending review, keeps the rest and journals it on the company", () => {
    const target = titled(PENDING_TITLE);
    const before = { rating: target.rating, comment: target.comment, response: target.response };
    const n = getStore().activity.length;
    const result = ignore(PENDING_TITLE, "  Propos injurieux  ");
    expect(result).toBe(target);
    expect(target.status).toBe("IGNORED");
    expect({ rating: target.rating, comment: target.comment, response: target.response }).toEqual(before);
    expect(getStore().activity).toHaveLength(n + 1);
    expect(getStore().activity[0]).toMatchObject({
      companyId: target.companyId, actor: "tester@sira.app", at: NOW.toISOString(),
      action: `Avis « ${PENDING_TITLE} » ignoré. Motif : Propos injurieux`,
    });
  });

  it("also ignores a reviewed review", () => {
    const reviewed = getStore().feedbacks.find((f) => f.status === "REVIEWED")!;
    feedbackRepo.ignore(reviewed.id, "Hors sujet", "tester@sira.app", NOW);
    expect(reviewed.status).toBe("IGNORED");
  });

  it("refuses an unknown review", () => {
    expect(() => feedbackRepo.ignore("00000000-0000-4000-8000-000000000000", "motif")).toThrow("Avis introuvable");
  });

  it("refuses a blank reason and changes nothing", () => {
    const target = titled(PENDING_TITLE);
    const n = getStore().activity.length;
    expect(() => ignore(PENDING_TITLE, "   ")).toThrow("Un motif est obligatoire");
    expect(target.status).toBe("PENDING");
    expect(getStore().activity).toHaveLength(n);
  });

  it("refuses a resolved review and keeps its response", () => {
    const target = titled(RESOLVED_TITLE);
    expect(() => ignore(RESOLVED_TITLE)).toThrow("Cet avis est déjà traité");
    expect(target.status).toBe("RESOLVED");
    expect(target.response).not.toBeNull();
  });

  it("refuses a review that is already ignored", () => {
    const ignored = getStore().feedbacks.find((f) => f.status === "IGNORED")!;
    expect(() => feedbackRepo.ignore(ignored.id, "motif")).toThrow("Cet avis est déjà traité");
  });

  it("checks the reason before the status", () => {
    const resolved = titled(RESOLVED_TITLE);
    expect(() => feedbackRepo.ignore(resolved.id, "")).toThrow("Un motif est obligatoire");
  });
});
