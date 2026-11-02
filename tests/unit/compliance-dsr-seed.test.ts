import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import type { DsrType } from "@/lib/types";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const DAY = 86_400_000;
beforeEach(() => resetStore(NOW));

const requestOf = (name: string, type: DsrType) => {
  const s = getStore();
  const found = s.dataSubjectRequests.filter(
    (r) => r.requestType === type && s.users.find((u) => u.id === r.requesterUserId)?.displayName === name,
  );
  expect(found, `${name} / ${type}`).toHaveLength(1);
  return found[0]!;
};

describe("data-subject requests seed", () => {
  it("has ten requests covering the four statuses and the six types", () => {
    const list = getStore().dataSubjectRequests;
    expect(list).toHaveLength(10);
    expect(new Set(list.map((r) => r.status))).toEqual(new Set(["RECEIVED", "IN_PROGRESS", "COMPLETED", "REJECTED"]));
    expect(new Set(list.map((r) => r.requestType))).toEqual(
      new Set(["ACCESS", "RECTIFICATION", "ERASURE", "PORTABILITY", "RESTRICTION", "OBJECTION"]),
    );
    expect(new Set(list.map((r) => r.id)).size).toBe(10);
  });

  it("links each request to an existing requester and, when set, to the requester's company", () => {
    const s = getStore();
    for (const r of s.dataSubjectRequests) {
      const user = s.users.find((u) => u.id === r.requesterUserId)!;
      expect(user).toBeDefined();
      if (r.companyId) expect(r.companyId).toBe(user.companyId);
      expect(r.reason.length).toBeGreaterThan(10);
    }
    expect(s.dataSubjectRequests.some((r) => r.companyId !== null)).toBe(true);
    expect(s.dataSubjectRequests.some((r) => r.companyId === null)).toBe(true);
  });

  it("sets the legal deadline thirty days after creation and never creates a request in the future", () => {
    for (const r of getStore().dataSubjectRequests) {
      expect(Date.parse(r.dueDate) - Date.parse(r.createdAt)).toBe(30 * DAY);
      expect(Date.parse(r.createdAt)).toBeLessThan(NOW.getTime());
    }
  });

  it("fills handler, resolution date and notes only where the status calls for them", () => {
    for (const r of getStore().dataSubjectRequests) {
      const closed = r.status === "COMPLETED" || r.status === "REJECTED";
      expect(r.resolvedAt !== null).toBe(closed);
      expect(r.resolutionNotes !== null).toBe(closed);
      expect(r.handledBy !== null).toBe(r.status !== "RECEIVED");
      if (r.resolvedAt) {
        expect(r.resolvedAt >= r.createdAt).toBe(true);
        expect(Date.parse(r.resolvedAt)).toBeLessThan(NOW.getTime());
      }
    }
  });

  it("has exactly one open request past its deadline", () => {
    const overdue = getStore().dataSubjectRequests.filter(
      (r) => (r.status === "RECEIVED" || r.status === "IN_PROGRESS") && Date.parse(r.dueDate) < NOW.getTime(),
    );
    expect(overdue).toHaveLength(1);
    expect(overdue[0]!.requestType).toBe("RECTIFICATION");
  });

  it("names the five E2E scenarios with unique requester and type pairs", () => {
    expect(requestOf("Ndèye Diouf", "ACCESS").status).toBe("RECEIVED");
    expect(requestOf("Lamine Camara", "ERASURE").status).toBe("IN_PROGRESS");
    expect(requestOf("Aïssatou Sarr", "OBJECTION").status).toBe("IN_PROGRESS");
    expect(requestOf("Pape Mbaye", "RECTIFICATION").status).toBe("RECEIVED");
    expect(requestOf("Aïssatou Sarr", "PORTABILITY").status).toBe("COMPLETED");
  });

  it("holds no e-mail address and no phone number", () => {
    expect(JSON.stringify(getStore().dataSubjectRequests)).not.toMatch(/@|\+221/);
  });
});
