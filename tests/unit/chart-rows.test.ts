import { describe, expect, it } from "vitest";
import { apiTrafficTable, serviceHistoryTable, serviceLatencyTable, usageTable } from "@/lib/chart-rows";

describe("chart text equivalents", () => {
  it("history rows carry the status as a text label", () => {
    const t = serviceHistoryTable([
      { label: "10:00", ms: 120, status: "healthy" },
      { label: "10:01", ms: 1500, status: "degraded" },
      { label: "10:02", ms: 0, status: "down" },
    ]);
    expect(t.columns).toEqual(["Contrôle (UTC)", "Réponse (ms)", "Statut"]);
    expect(t.rows).toEqual([["10:00", "120", "Opérationnel"], ["10:01", "1500", "Dégradé"], ["10:02", "0", "En panne"]]);
  });
  it("traffic and usage rows list every count per day", () => {
    expect(apiTrafficTable([{ label: "01/11", ok: 5, clientErrors: 2, serverErrors: 1 }]).rows).toEqual([["01/11", "5", "2", "1"]]);
    expect(usageTable([{ label: "01/11", booking: 3, parcel: 2, customer: 1 }]).rows).toEqual([["01/11", "3", "2", "1"]]);
  });
  it("latency rows show no time for a service that is down", () => {
    const t = serviceLatencyTable([{ name: "a-service", responseTimeMs: 90, status: "healthy" }, { name: "b-service", responseTimeMs: 0, status: "down" }]);
    expect(t.rows).toEqual([["a-service", "90", "Opérationnel"], ["b-service", "—", "En panne"]]);
  });
});
