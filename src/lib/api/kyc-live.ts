import { redirect } from "next/navigation";
import { ApiError, apiCall } from "@/lib/api/http";
import { currentBackendToken } from "@/lib/api/session-token";
import type { KycBoard, KycBoardQuery } from "@/lib/repos/companies";

/** GET /admin/kyc/board (company-service): the column keys and card fields already match the front types. */
export async function liveKycBoard(query: KycBoardQuery = {}): Promise<KycBoard> {
  try {
    const token = await currentBackendToken();
    const qs = new URLSearchParams();
    if (query.q) qs.set("q", query.q);
    if (query.minAge) qs.set("minAge", String(query.minAge));
    if (query.tier) qs.set("tier", query.tier);
    if (query.sort) qs.set("sort", query.sort);
    const names = { submitted: "pageSubmitted", needs_info: "pageNeedsInfo", in_review: "pageInReview", approved: "pageApproved", rejected: "pageRejected" } as const;
    for (const [stage, param] of Object.entries(names)) {
      const n = query.pages?.[stage as keyof typeof names];
      if (n && n > 1) qs.set(param, String(n));
    }
    return await apiCall<KycBoard>(`/admin/kyc/board${qs.size ? `?${qs}` : ""}`, { token });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) redirect("/session-expiree");
    throw e;
  }
}
