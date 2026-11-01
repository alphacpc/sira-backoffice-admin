import { beforeEach, describe, expect, it } from "vitest";
import { companiesRepo } from "@/lib/repos/companies";
import { resetStore } from "@/lib/repos/store";
import { KYC_TYPES } from "@/lib/types/kyc";

beforeEach(() => resetStore());

describe("companiesRepo.list", () => {
  it("returns the 20 seeded companies", () => {
    expect(companiesRepo.list()).toHaveLength(20);
  });
  it("filters by status", () => {
    const drafts = companiesRepo.list({ status: "draft" });
    expect(drafts).toHaveLength(5);
    expect(drafts.every((c) => c.status === "draft")).toBe(true);
  });
  it("searches name and slug case-insensitively", () => {
    expect(companiesRepo.list({ q: "KOLDA" }).map((c) => c.name)).toEqual(["Kolda Voyages"]);
    expect(companiesRepo.list({ q: "saint-louis" })).toHaveLength(1);
  });
});

describe("companiesRepo.detail", () => {
  it("returns undefined for an unknown id", () => {
    expect(companiesRepo.detail("nope")).toBeUndefined();
  });
  it("returns related records for a company", () => {
    const active = companiesRepo.list({ status: "active" })[0]!;
    const d = companiesRepo.detail(active.id)!;
    expect(d.documents).toHaveLength(KYC_TYPES.length);
    expect(d.subscription).not.toBeNull();
    expect(d.employees.length).toBeGreaterThan(0);
  });
});

describe("kyc workflow", () => {
  it("kycQueue lists only pending documents, oldest first, with company names", () => {
    const q = companiesRepo.kycQueue();
    expect(q.length).toBeGreaterThan(0);
    expect(q.every((d) => d.status === "pending" && d.companyName.length > 0)).toBe(true);
    const times = q.map((d) => d.uploadedAt);
    expect([...times].sort()).toEqual(times);
  });

  function almostDone() {
    for (const c of companiesRepo.list({ status: "draft" })) {
      const d = companiesRepo.detail(c.id)!;
      const approved = d.documents.filter((x) => x.status === "approved").length;
      const pending = d.documents.filter((x) => x.status === "pending");
      if (approved === KYC_TYPES.length - 1 && pending.length === 1) return { c, doc: pending[0]! };
    }
    throw new Error("seed has no almost-complete draft company");
  }

  it("approving the last missing document activates the company", () => {
    const { c, doc } = almostDone();
    companiesRepo.reviewDocument(doc.id, "approved");
    const after = companiesRepo.get(c.id)!;
    expect(after.status).toBe("active");
    expect(after.activatedAt).not.toBeNull();
    expect(after.forceActivated).toBe(false);
  });

  it("rejecting requires a reason and stores it", () => {
    const { doc } = almostDone();
    expect(() => companiesRepo.reviewDocument(doc.id, "rejected")).toThrow(/motif/i);
    const out = companiesRepo.reviewDocument(doc.id, "rejected", "Flou");
    expect(out.status).toBe("rejected");
    expect(out.rejectionReason).toBe("Flou");
  });

  it("refuses to review a document that is not pending", () => {
    const approved = companiesRepo.detail(companiesRepo.list({ status: "active" })[0]!.id)!.documents[0]!;
    expect(() => companiesRepo.reviewDocument(approved.id, "approved")).toThrow(/en attente/i);
  });

  it("records an activity entry for each review", () => {
    const { c, doc } = almostDone();
    const before = companiesRepo.detail(c.id)!.activity.length;
    companiesRepo.reviewDocument(doc.id, "approved", undefined, "admin@sira.app");
    expect(companiesRepo.detail(c.id)!.activity.length).toBeGreaterThan(before);
  });
});

describe("forceActivate", () => {
  it("requires a reason", () => {
    const draft = companiesRepo.list({ status: "draft" })[0]!;
    expect(() => companiesRepo.forceActivate(draft.id, "  ")).toThrow(/motif/i);
  });
  it("activates a draft company and flags it", () => {
    const draft = companiesRepo.list({ status: "draft" })[0]!;
    const out = companiesRepo.forceActivate(draft.id, "vérifié hors ligne");
    expect(out.status).toBe("active");
    expect(out.forceActivated).toBe(true);
    expect(out.activatedAt).not.toBeNull();
  });
  it("is a no-op on an already active company (keeps its real activation)", () => {
    const active = companiesRepo.list({ status: "active" })[0]!;
    const out = companiesRepo.forceActivate(active.id, "test");
    expect(out.activatedAt).toBe(active.activatedAt);
    expect(out.forceActivated).toBe(active.forceActivated);
  });
  it("throws for an unknown company", () => {
    expect(() => companiesRepo.forceActivate("nope", "x")).toThrow(/introuvable/i);
  });
});

describe("logReveal", () => {
  it("adds an activity entry mentioning the field, never the value", () => {
    const c = companiesRepo.list()[0]!;
    companiesRepo.logReveal(c.id, "email", "admin@sira.app");
    const last = companiesRepo.detail(c.id)!.activity[0]!;
    expect(last.action).toMatch(/e-mail/i);
    expect(last.action).not.toContain(c.contactEmail);
  });
});
