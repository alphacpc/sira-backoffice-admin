import { beforeEach, describe, expect, it } from "vitest";
import { featuresRepo, kycTypesRepo, plansRepo, tiersRepo } from "@/lib/repos/billing";
import { companiesRepo } from "@/lib/repos/companies";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-01T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const planByName = (name: string) => getStore().plans.find((p) => p.name === name)!;
const louga = () => companiesRepo.list({ q: "louga" })[0]!;
const lougaInsuranceDoc = () =>
  getStore().documents.find((d) => d.companyId === louga().id && d.typeCode === "INSURANCE")!;

describe("plansRepo", () => {
  const ALLOWED = ["code", "currency", "id", "liveSubscriptions", "name", "priceMonthly", "priceYearly", "status", "trialDays"];

  it("listRows exposes exactly the allowed keys and counts live subscriptions per plan", () => {
    const rows = plansRepo.listRows();
    for (const r of rows) expect(Object.keys(r).sort()).toEqual(ALLOWED);
    expect(rows.map((r) => [r.name, r.liveSubscriptions])).toEqual([
      ["Starter", 4], ["Pro", 5], ["Enterprise", 4], ["Legacy", 0],
    ]);
  });

  it("detail returns the plan, its features in plan order and its subscriptions", () => {
    const pro = planByName("Pro");
    const d = plansRepo.detail(pro.id)!;
    expect(d.plan.id).toBe(pro.id);
    expect(d.features.map((f) => f.code)).toEqual(pro.featureCodes);
    expect(d.subscriptions).toHaveLength(5);
    expect(d.subscriptions.every((s) => s.planName === "Pro" && s.companyName !== "—")).toBe(true);
  });

  it("detail returns undefined for an unknown plan", () => {
    expect(plansRepo.detail("nope")).toBeUndefined();
    expect(plansRepo.get("nope")).toBeUndefined();
  });
});

describe("featuresRepo", () => {
  it("lists each feature with the plans that include it", () => {
    const list = featuresRepo.list();
    expect(list).toHaveLength(6);
    expect(list.find((f) => f.code === "ONLINE_BOOKING")!.plans.map((p) => p.name))
      .toEqual(["Starter", "Pro", "Enterprise", "Legacy"]);
    expect(list.find((f) => f.code === "HR")!.plans.map((p) => p.name)).toEqual(["Enterprise"]);
    expect(Object.keys(list[0]!.plans[0]!).sort()).toEqual(["id", "name", "status"]);
  });
});

describe("tiersRepo", () => {
  it("counts companies per tier, ordered by minimum seniority", () => {
    expect(tiersRepo.list().map((t) => [t.code, t.companies])).toEqual([
      ["STANDARD", 12], ["SILVER", 5], ["GOLD", 3],
    ]);
  });
});

describe("kycTypesRepo.setActive", () => {
  it("deactivates a type and logs a platform activity with the actor and the reason", () => {
    const n = getStore().activity.length;
    const t = kycTypesRepo.setActive("NINEA", false, "  Exigence levée  ", "tester@sira.app");
    expect(t.active).toBe(false);
    expect(kycTypesRepo.requiredActive().map((x) => x.code)).not.toContain("NINEA");
    const entry = getStore().activity[0]!;
    expect(getStore().activity.length).toBe(n + 1);
    expect(entry.companyId).toBeNull();
    expect(entry.actor).toBe("tester@sira.app");
    expect(entry.action).toBe("Type de document KYC « NINEA » désactivé. Motif : Exigence levée");
  });

  it("requires a reason", () => {
    expect(() => kycTypesRepo.setActive("NINEA", false, "   ")).toThrow("Un motif est obligatoire");
    expect(kycTypesRepo.list().find((t) => t.code === "NINEA")!.active).toBe(true);
  });

  it("throws for an unknown type", () => {
    expect(() => kycTypesRepo.setActive("NOPE", false, "x")).toThrow("Type de document introuvable");
  });

  it("is a no-op without activity when the state does not change", () => {
    const n = getStore().activity.length;
    kycTypesRepo.setActive("NINEA", true, "déjà actif");
    expect(getStore().activity.length).toBe(n);
  });

  it("refuses to deactivate the last active required type", () => {
    const codes = kycTypesRepo.list().map((t) => t.code);
    for (const code of codes.slice(0, -1)) kycTypesRepo.setActive(code, false, "test");
    const last = codes.at(-1)!;
    expect(() => kycTypesRepo.setActive(last, false, "test"))
      .toThrow("Impossible de désactiver le dernier type de document obligatoire actif");
    expect(kycTypesRepo.requiredActive().map((t) => t.code)).toEqual([last]);
  });

  it("reactivates a type", () => {
    kycTypesRepo.setActive("NINEA", false, "test");
    kycTypesRepo.setActive("NINEA", true, "retour");
    expect(kycTypesRepo.requiredActive()).toHaveLength(6);
    expect(getStore().activity[0]!.action).toBe("Type de document KYC « NINEA » réactivé. Motif : retour");
  });
});

describe("KYC registry drives company activation", () => {
  it("keeps Louga Trans in draft when every type is still required", () => {
    companiesRepo.reviewDocument(lougaInsuranceDoc().id, "approved");
    expect(companiesRepo.get(louga().id)!.status).toBe("draft");
  });

  it("activates Louga Trans once its missing and rejected types are no longer required", () => {
    kycTypesRepo.setActive("TRANSPORT_LICENSE", false, "test");
    kycTypesRepo.setActive("ID_MANAGER", false, "test");
    companiesRepo.reviewDocument(lougaInsuranceDoc().id, "approved");
    const c = companiesRepo.get(louga().id)!;
    expect(c.status).toBe("active");
    expect(c.forceActivated).toBe(false);
  });

  it("requires a reactivated type again", () => {
    kycTypesRepo.setActive("TRANSPORT_LICENSE", false, "test");
    kycTypesRepo.setActive("ID_MANAGER", false, "test");
    kycTypesRepo.setActive("ID_MANAGER", true, "test");
    companiesRepo.reviewDocument(lougaInsuranceDoc().id, "approved");
    expect(companiesRepo.get(louga().id)!.status).toBe("draft");
  });

  it("exposes the registry in the company detail", () => {
    expect(companiesRepo.detail(louga().id)!.kycTypes).toHaveLength(6);
  });
});
