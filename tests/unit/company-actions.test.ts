import { beforeEach, describe, expect, it, vi } from "vitest";

const revalidatePath = vi.fn();
vi.mock("next/cache", () => ({ revalidatePath: (p: string) => revalidatePath(p) }));
const requireSession = vi.fn();
vi.mock("@/lib/auth/session", () => ({ requireSession: () => requireSession() }));

import {
  approveDocument, forceActivateCompany, rejectDocument, revealContact,
} from "@/app/(admin)/compagnies/actions";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore, resetStore } from "@/lib/repos/store";

const session = { sub: "tester@sira.app", stage: "full", exp: 9999999999 };

beforeEach(() => {
  resetStore();
  revalidatePath.mockClear();
  requireSession.mockReset();
  requireSession.mockResolvedValue(session);
});

const pendingDoc = () => companiesRepo.kycQueue()[0]!;
const draft = () => getStore().companies.find((c) => c.status === "draft")!;

describe("no session", () => {
  beforeEach(() => {
    requireSession.mockRejectedValue(new Error("Non authentifié"));
  });
  it("approveDocument", async () => {
    const d = pendingDoc();
    expect(await approveDocument(d.id)).toEqual({ ok: false, error: expect.stringMatching(/Session expirée/) });
    expect(getStore().documents.find((x) => x.id === d.id)!.status).toBe("pending");
  });
  it("rejectDocument", async () => {
    const d = pendingDoc();
    const r = await rejectDocument(d.id, "illisible");
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/Session expirée/) });
    expect(getStore().documents.find((x) => x.id === d.id)!.status).toBe("pending");
  });
  it("forceActivateCompany", async () => {
    const c = draft();
    const r = await forceActivateCompany(c.id, "ok");
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/Session expirée/) });
    expect(c.status).toBe("draft");
  });
  it("revealContact", async () => {
    const c = draft();
    const n = getStore().activity.length;
    const r = await revealContact(c.id, "email");
    expect(r).toEqual({ ok: false, error: expect.stringMatching(/Session expirée/) });
    expect("value" in r).toBe(false);
    expect(getStore().activity.length).toBe(n);
  });
});

describe("approveDocument", () => {
  it("approves and revalidates", async () => {
    const d = pendingDoc();
    expect(await approveDocument(d.id)).toEqual({ ok: true });
    expect(getStore().documents.find((x) => x.id === d.id)!.status).toBe("approved");
    const paths = revalidatePath.mock.calls.map((c) => c[0]);
    expect(paths).toEqual(expect.arrayContaining(["/", "/compagnies", "/compagnies/kyc", `/compagnies/${d.companyId}`]));
  });
  it("returns the French repo message on an already-approved doc", async () => {
    const d = pendingDoc();
    await approveDocument(d.id);
    const r = await approveDocument(d.id);
    expect(r).toEqual({ ok: false, error: "Le document n'est pas en attente de revue" });
  });
});

describe("rejectDocument", () => {
  it("rejects a blank reason", async () => {
    const d = pendingDoc();
    for (const reason of ["", "   "]) {
      const r = await rejectDocument(d.id, reason);
      expect(r.ok).toBe(false);
      expect(!r.ok && r.error).toMatch(/motif/i);
    }
    expect(getStore().documents.find((x) => x.id === d.id)!.status).toBe("pending");
  });
  it("stores the trimmed reason", async () => {
    const d = pendingDoc();
    expect(await rejectDocument(d.id, "  flou  ")).toEqual({ ok: true });
    const stored = getStore().documents.find((x) => x.id === d.id)!;
    expect(stored.status).toBe("rejected");
    expect(JSON.stringify(stored)).toContain("flou");
    expect(JSON.stringify(stored)).not.toContain("  flou");
  });
});

describe("forceActivateCompany", () => {
  it("blank reason fails", async () => {
    const c = draft();
    expect((await forceActivateCompany(c.id, "  ")).ok).toBe(false);
    expect(c.status).toBe("draft");
  });
  it("unknown company", async () => {
    const r = await forceActivateCompany("nope", "raison");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/introuvable/i);
  });
  it("succeeds", async () => {
    const c = draft();
    expect(await forceActivateCompany(c.id, "raison")).toEqual({ ok: true });
    expect(c.status).toBe("active");
  });
});

describe("revealContact", () => {
  it("rejects invalid field", async () => {
    const r = await revealContact(draft().id, "address" as never);
    expect(r.ok).toBe(false);
  });
  it("rejects unknown company", async () => {
    const r = await revealContact("nope", "email");
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/introuvable/i);
  });
  it("logs an activity without the value, by session actor", async () => {
    const c = draft();
    const n = getStore().activity.length;
    expect(await revealContact(c.id, "email")).toEqual({ ok: true, value: c.contactEmail });
    const added = getStore().activity.slice(0, getStore().activity.length - n);
    expect(added).toHaveLength(1);
    expect(added[0]!.actor).toBe("tester@sira.app");
    expect(added[0]!.action).not.toContain(c.contactEmail);
  });
  it("returns the exact stored phone and logs without the value", async () => {
    const c = draft();
    const n = getStore().activity.length;
    expect(await revealContact(c.id, "phone")).toEqual({ ok: true, value: c.contactPhone });
    const added = getStore().activity.slice(0, getStore().activity.length - n);
    expect(added).toHaveLength(1);
    expect(added[0]!.action).not.toContain(c.contactPhone);
  });
  it("never returns a value on failure", async () => {
    const a = await revealContact(draft().id, "address" as never);
    const b = await revealContact("nope", "email");
    expect("value" in a).toBe(false);
    expect("value" in b).toBe(false);
  });
});
