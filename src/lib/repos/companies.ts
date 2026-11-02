import { addActivity } from "@/lib/repos/activity";
import { kycTypesRepo } from "@/lib/repos/billing";
import { companyFleetSummary } from "@/lib/repos/fleet";
import { getStore } from "@/lib/repos/store";
import type { Company, CompanyDetail, CompanyStatus, KycDocument, KycStage } from "@/lib/types";

/** Projection safe to hand to a client component: no contact data. */
export type CompanyRow = Pick<Company, "id" | "slug" | "name" | "status" | "partnerTier" | "createdAt" | "activatedAt"> & {
  /** Name of the company manager (its owner account); no contact data. */
  ownerName: string | null;
  busCount: number;
  /** Plan of the current subscription (trial, active, past due or suspended); `null` when there is none. */
  planName: string | null;
  billingCycle: "MONTHLY" | "YEARLY" | null;
};

export interface KycQueueItem extends KycDocument { companyName: string }

export const KYC_STAGES: KycStage[] = ["submitted", "needs_info", "in_review", "approved", "rejected"];
export const KYC_PAGE_SIZE = 8;
export const KYC_SORTS = ["oldest", "newest", "name", "progress"] as const;
export type KycSort = (typeof KYC_SORTS)[number];
export const KYC_MIN_AGES = [0, 7, 14, 30] as const;
const DAY_MS = 86_400_000;

export interface KycCardDoc { id: string; typeName: string; status: "approved" | "pending" | "rejected" | "missing" }
export interface KycCard {
  companyId: string; name: string; ownerName: string | null; stage: KycStage;
  partnerTier: Company["partnerTier"];
  docsApproved: number; docsRequired: number; docs: KycCardDoc[];
  /** Days since the file was submitted (oldest document), or since activation for a validated company. */
  ageDays: number;
  /** Reason given when the file was moved to « Complément » or « Rejeté ». */
  note: string | null;
}
export interface KycBoardQuery {
  q?: string; minAge?: number; tier?: Company["partnerTier"]; sort?: KycSort;
  /** Page (from 1) of each column. */
  pages?: Partial<Record<KycStage, number>>;
}
export interface KycColumn { total: number; page: number; pageCount: number; cards: KycCard[] }
export interface KycBoard {
  columns: Record<KycStage, KycColumn>;
  /** Cards matching the filters, all columns together. */
  total: number;
  /** Open files (not validated, not rejected) waiting for more than 14 days. */
  late: number;
}

function activateIfKycComplete(company: Company): void {
  if (company.status !== "draft") return;
  const docs = getStore().documents.filter((d) => d.companyId === company.id);
  const required = kycTypesRepo.requiredActive();
  const complete = required.length > 0 && required.every((t) =>
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

  listRows(filter: { status?: CompanyStatus; q?: string } = {}): CompanyRow[] {
    const { employees, buses, subscriptions } = getStore();
    const live = ["trial", "active", "past_due", "suspended"];
    return companiesRepo.list(filter).map((c) => ({
      id: c.id, slug: c.slug, name: c.name, status: c.status,
      partnerTier: c.partnerTier, createdAt: c.createdAt, activatedAt: c.activatedAt,
      ownerName: employees.find((e) => e.companyId === c.id && e.role === "MANAGER")?.name ?? null,
      busCount: buses.filter((b) => b.companyId === c.id).length,
      planName: subscriptions.find((x) => x.companyId === c.id && live.includes(x.status))?.planName ?? null,
      billingCycle: subscriptions.find((x) => x.companyId === c.id && live.includes(x.status))?.billingCycle ?? null,
    }));
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
      kycTypes: kycTypesRepo.list(),
      subscription: s.subscriptions.find((x) => x.companyId === id) ?? null,
      invoices: s.invoices.filter((x) => x.companyId === id),
      limits: s.limits[id] ?? null,
      features: s.features[id] ?? [],
      usage: s.usage[id] ?? [],
      referral: s.referrals[id] ?? { code: null, credits: [] },
      employees: s.employees.filter((e) => e.companyId === id),
      ...companyFleetSummary(id),
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

  /** The review board: one card per company in the KYC process, filtered, sorted and paged per column. */
  kycBoard(query: KycBoardQuery = {}, now: Date = new Date()): KycBoard {
    const s = getStore();
    const required = kycTypesRepo.requiredActive();
    const ownerOf = (id: string) => s.employees.find((e) => e.companyId === id && e.role === "MANAGER")?.name ?? null;
    const card = (c: Company, stage: KycStage, note: string | null): KycCard => {
      const docs = s.documents.filter((d) => d.companyId === c.id);
      const cardDocs = required.map((t): KycCardDoc => {
        const d = docs.filter((x) => x.typeCode === t.code).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt))[0];
        return { id: d?.id ?? "", typeName: t.name, status: d?.status ?? "missing" };
      });
      const since = stage === "approved" ? (c.activatedAt ?? c.createdAt)
        : docs.map((d) => d.uploadedAt).sort()[0] ?? c.createdAt;
      return {
        companyId: c.id, name: c.name, ownerName: ownerOf(c.id), stage, partnerTier: c.partnerTier, docs: cardDocs,
        docsApproved: cardDocs.filter((d) => d.status === "approved").length, docsRequired: required.length,
        ageDays: Math.max(0, Math.floor((now.getTime() - Date.parse(since)) / DAY_MS)), note,
      };
    };
    const all: KycCard[] = [];
    for (const c of s.companies) {
      if (c.status === "draft") {
        const docs = s.documents.filter((d) => d.companyId === c.id);
        const override = (s.kycOverrides ??= {})[c.id];
        const derived: KycStage = docs.some((d) => d.status === "rejected") ? "needs_info"
          : docs.filter((d) => d.status === "approved").length >= 2 ? "in_review" : "submitted";
        all.push(card(c, override?.stage ?? derived, override?.note ?? null));
      } else if (c.status === "closed") all.push(card(c, "rejected", "Compagnie fermée"));
      else if (c.status === "active") all.push(card(c, "approved", null));
    }

    const q = query.q?.trim().toLowerCase();
    const minAge = query.minAge ?? 0;
    const matching = all.filter((c) =>
      (!q || c.name.toLowerCase().includes(q) || (c.ownerName ?? "").toLowerCase().includes(q)) &&
      (!minAge || c.ageDays >= minAge) && (!query.tier || c.partnerTier === query.tier));
    const sort = query.sort ?? "oldest";
    const byAge = (a: KycCard, b: KycCard) => b.ageDays - a.ageDays;
    const order: Record<KycSort, (a: KycCard, b: KycCard) => number> = {
      oldest: byAge, newest: (a, b) => -byAge(a, b), name: (a, b) => a.name.localeCompare(b.name),
      progress: (a, b) => b.docsApproved - a.docsApproved,
    };
    matching.sort((a, b) => order[sort](a, b) || a.name.localeCompare(b.name) || a.companyId.localeCompare(b.companyId));

    const columns = {} as Record<KycStage, KycColumn>;
    for (const stage of KYC_STAGES) {
      const list = matching.filter((c) => c.stage === stage);
      const pageCount = Math.max(1, Math.ceil(list.length / KYC_PAGE_SIZE));
      const page = Math.min(Math.max(1, Math.floor(query.pages?.[stage] ?? 1)), pageCount);
      columns[stage] = { total: list.length, page, pageCount, cards: list.slice((page - 1) * KYC_PAGE_SIZE, page * KYC_PAGE_SIZE) };
    }
    return {
      columns, total: matching.length,
      late: matching.filter((c) => c.stage !== "approved" && c.stage !== "rejected" && c.ageDays > 14).length,
    };
  },

  /** Moves a company to another column of the board. */
  moveKycStage(companyId: string, stage: KycStage, note: string | undefined, actor = "admin@sira.app", now: Date = new Date()): void {
    const s = getStore();
    const company = s.companies.find((c) => c.id === companyId);
    if (!company) throw new Error("Compagnie introuvable");
    if (company.status !== "draft") throw new Error("Seuls les dossiers en brouillon peuvent changer d'étape");
    const label: Record<KycStage, string> = {
      submitted: "Soumis", needs_info: "Complément de dossier", in_review: "En cours", approved: "Validé", rejected: "Rejeté",
    };
    if (stage === "submitted") throw new Error("Un dossier ne revient pas à « Soumis »");
    if (stage === "approved") throw new Error("Pour valider un dossier, approuve tous ses documents : la compagnie est alors activée");
    const text = note?.trim() ?? "";
    if ((stage === "needs_info" || stage === "rejected") && !text) throw new Error("Un motif est obligatoire");
    (s.kycOverrides ??= {})[companyId] = { stage, note: text || null, at: now.toISOString() };
    addActivity(companyId, actor, `Dossier KYC déplacé vers « ${label[stage]} »`, now);
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
