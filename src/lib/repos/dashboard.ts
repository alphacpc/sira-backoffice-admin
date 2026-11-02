import { getStore } from "@/lib/repos/store";
import type { ActivityEntry, DsrType, Incident, ServiceHealth, Subscription } from "@/lib/types";

export interface Overview {
  kpis: {
    companies: number; active: number; draft: number;
    pastDue: number; openIncidents: number; pendingKyc: number;
  };
  services: ServiceHealth[];
  incidents: Incident[];
  pastDue: (Subscription & { companyName: string })[];
  dsr: { id: string; requestType: DsrType; requesterName: string; dueDate: string; daysLeft: number }[];
  activity: (ActivityEntry & { companyName: string | null })[];
}

const DAY = 86_400_000;

export const dashboardRepo = {
  overview(now: Date = new Date()): Overview {
    const s = getStore();
    const name = (id: string | null) =>
      id ? (s.companies.find((c) => c.id === id)?.name ?? null) : null;
    const pastDue = s.subscriptions
      .filter((x) => x.status === "past_due")
      .map((x) => ({ ...x, companyName: name(x.companyId) ?? "—" }));
    return {
      kpis: {
        companies: s.companies.length,
        active: s.companies.filter((c) => c.status === "active").length,
        draft: s.companies.filter((c) => c.status === "draft").length,
        pastDue: pastDue.length,
        openIncidents: s.incidents.filter((i) => i.status !== "RESOLVED").length,
        pendingKyc: s.documents.filter((d) => d.status === "pending").length,
      },
      services: s.services,
      incidents: s.incidents.filter((i) => i.status !== "RESOLVED"),
      pastDue,
      dsr: s.dataSubjectRequests
        .filter((d) => d.status === "RECEIVED" || d.status === "IN_PROGRESS")
        .map((d) => ({
          id: d.id, requestType: d.requestType, dueDate: d.dueDate,
          requesterName: s.users.find((u) => u.id === d.requesterUserId)?.displayName ?? "—",
          daysLeft: Math.ceil((new Date(d.dueDate).getTime() - now.getTime()) / DAY),
        }))
        .sort((a, b) => a.daysLeft - b.daysLeft),
      activity: [...s.activity]
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 8)
        .map((a) => ({ ...a, companyName: name(a.companyId) })),
    };
  },
};
