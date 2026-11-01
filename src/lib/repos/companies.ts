import { getStore } from "@/lib/repos/store";
import { KYC_TYPES } from "@/lib/types/kyc";
import type {
  ActivityEntry, Company, CompanyDetail, CompanyStatus, KycDocument,
} from "@/lib/types";

export interface KycQueueItem extends KycDocument { companyName: string }

let actCounter = 1;
function addActivity(companyId: string | null, actor: string, action: string): void {
  const entry: ActivityEntry = {
    id: `act-${Date.now()}-${actCounter++}`, companyId,
    at: new Date().toISOString(), actor, action,
  };
  getStore().activity.unshift(entry);
}

function activateIfKycComplete(company: Company): void {
  if (company.status !== "draft") return;
  const docs = getStore().documents.filter((d) => d.companyId === company.id);
  const complete = KYC_TYPES.every((t) =>
    docs.some((d) => d.typeCode === t.code && d.status === "approved"),
  );
  if (!complete) return;
  company.status = "active";
  company.activatedAt = new Date().toISOString();
  company.forceActivated = false;
  addActivity(company.id, "system", "Compagnie activée (KYC complet)");
}

export const companiesRepo = {
  list(filter: { status?: CompanyStatus; q?: string } = {}): Company[] {
    const q = filter.q?.trim().toLowerCase();
    return getStore().companies.filter(
      (c) =>
        (!filter.status || c.status === filter.status) &&
        (!q || c.name.toLowerCase().includes(q) || c.slug.includes(q)),
    );
  },

  get(id: string): Company | undefined {
    return getStore().companies.find((c) => c.id === id);
  },

  names(): { id: string; name: string }[] {
    return getStore().companies.map((c) => ({ id: c.id, name: c.name }));
  },

  detail(id: string): CompanyDetail | undefined {
    const s = getStore();
    const company = s.companies.find((c) => c.id === id);
    if (!company) return undefined;
    return {
      company,
      documents: s.documents.filter((d) => d.companyId === id),
      subscription: s.subscriptions.find((x) => x.companyId === id) ?? null,
      invoices: s.invoices.filter((x) => x.companyId === id),
      limits: s.limits[id] ?? null,
      features: s.features[id] ?? [],
      usage: s.usage[id] ?? [],
      referral: s.referrals[id] ?? { code: null, credits: [] },
      employees: s.employees.filter((e) => e.companyId === id),
      buses: s.buses.filter((b) => b.companyId === id),
      trips: s.trips.filter((t) => t.companyId === id),
      activity: s.activity
        .filter((a) => a.companyId === id)
        .sort((a, b) => b.at.localeCompare(a.at)),
    };
  },

  kycQueue(): KycQueueItem[] {
    const s = getStore();
    return s.documents
      .filter((d) => d.status === "pending")
      .map((d) => ({
        ...d,
        companyName: s.companies.find((c) => c.id === d.companyId)?.name ?? "—",
      }))
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt));
  },

  reviewDocument(
    docId: string,
    decision: "approved" | "rejected",
    reason?: string,
    actor = "admin@sira.app",
  ): KycDocument {
    const s = getStore();
    const doc = s.documents.find((d) => d.id === docId);
    if (!doc) throw new Error("Document introuvable");
    if (doc.status !== "pending") throw new Error("Le document n'est pas en attente de revue");
    if (decision === "rejected" && !reason?.trim()) throw new Error("Un motif de rejet est obligatoire");
    doc.status = decision;
    doc.reviewedAt = new Date().toISOString();
    doc.rejectionReason = decision === "rejected" ? reason!.trim() : null;
    addActivity(
      doc.companyId, actor,
      `Document ${doc.typeName} ${decision === "approved" ? "approuvé" : "rejeté"}`,
    );
    const company = s.companies.find((c) => c.id === doc.companyId);
    if (company && decision === "approved") activateIfKycComplete(company);
    return doc;
  },

  forceActivate(companyId: string, reason: string, actor = "admin@sira.app"): Company {
    const company = getStore().companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    if (!reason.trim()) throw new Error("Un motif est obligatoire");
    if (company.status === "active") return company;
    company.status = "active";
    company.activatedAt = new Date().toISOString();
    company.forceActivated = true;
    addActivity(companyId, actor, "Activation forcée (contournement du KYC)");
    return company;
  },

  logReveal(companyId: string, field: "email" | "phone", actor = "admin@sira.app"): void {
    addActivity(
      companyId, actor,
      `Donnée personnelle révélée : ${field === "email" ? "e-mail" : "téléphone"}`,
    );
  },
};
