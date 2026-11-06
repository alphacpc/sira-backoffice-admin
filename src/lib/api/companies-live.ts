import { redirect } from "next/navigation";
import { ApiError, apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";
import type { CompanyRow } from "@/lib/repos/companies";
import type { CompanyStatus } from "@/lib/types";

/** Shape of GET /admin/companies/overview (admin-bff-service). */
interface Overview {
  content: {
    id: string; slug: string; name: string; status: string; createdAt: string; activatedAt: string | null;
    partnerTier: string | null; planName: string | null; billingCycle: string | null;
    ownerName: string | null; busCount: number | null;
  }[];
  page: number; size: number; totalElements: number; totalPages: number;
  counts: { all: number; draft: number; active: number; suspended: number; closed: number };
  kycPending: number;
  warnings: { section: string; reason: string }[];
}

export interface LiveCompanies {
  rows: CompanyRow[];
  counts: Overview["counts"];
  kycPending: number;
  /** True when the platform holds more companies than the table loads. */
  truncated: boolean;
}

const PAGE = 100;
const MAX_PAGES = 5;
const STATUSES: CompanyStatus[] = ["draft", "active", "suspended", "closed"];
const TIERS = ["STANDARD", "SILVER", "GOLD"] as const;

const asStatus = (v: string): CompanyStatus => {
  const s = v.toLowerCase() as CompanyStatus;
  return STATUSES.includes(s) ? s : "draft";
};
const asTier = (v: string | null): CompanyRow["partnerTier"] => {
  const t = (v ?? "").toUpperCase();
  return (TIERS as readonly string[]).includes(t) ? (t as CompanyRow["partnerTier"]) : "STANDARD";
};
const asCycle = (v: string | null): CompanyRow["billingCycle"] => {
  const c = (v ?? "").toUpperCase();
  return c === "MONTHLY" || c === "YEARLY" ? c : null;
};

export function toRow(c: Overview["content"][number]): CompanyRow {
  return {
    id: c.id, slug: c.slug, name: c.name, status: asStatus(c.status), partnerTier: asTier(c.partnerTier),
    createdAt: c.createdAt, activatedAt: c.activatedAt, ownerName: c.ownerName, busCount: c.busCount ?? 0,
    planName: c.planName, billingCycle: asCycle(c.billingCycle),
  };
}

export async function liveCompanies(status?: CompanyStatus): Promise<LiveCompanies> {
  try {
    const token = await currentBackendToken();
    const rows: CompanyRow[] = [];
    let first: Overview | null = null;
    for (let page = 0; page < MAX_PAGES; page++) {
      const qs = new URLSearchParams({ page: String(page), size: String(PAGE), sort: "name,asc" });
      if (status) qs.set("status", status);
      const res = await apiCall<Overview>(`/admin/companies/overview?${qs}`, { token });
      first ??= res;
      rows.push(...res.content.map(toRow));
      if (page + 1 >= res.totalPages) break;
    }
    const f = first!;
    return { rows, counts: f.counts, kycPending: f.kycPending, truncated: f.totalElements > rows.length };
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) redirect("/session-expiree");
    throw e;
  }
}
