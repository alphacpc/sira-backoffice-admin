import { serviceStatusBadge } from "@/lib/labels";
import type { ServiceHealth } from "@/lib/types";

/** Text equivalent of a chart: column headers and string cells (no colour, no hover needed). */
export interface ChartTable { columns: string[]; rows: string[][] }

export function serviceHistoryTable(points: { label: string; ms: number; status: ServiceHealth["status"] }[]): ChartTable {
  return {
    columns: ["Contrôle (UTC)", "Réponse (ms)", "Statut"],
    rows: points.map((p) => [p.label, String(p.ms), serviceStatusBadge(p.status).label]),
  };
}

export function apiTrafficTable(points: { label: string; ok: number; clientErrors: number; serverErrors: number }[]): ChartTable {
  return {
    columns: ["Jour", "2xx", "4xx", "5xx"],
    rows: points.map((p) => [p.label, String(p.ok), String(p.clientErrors), String(p.serverErrors)]),
  };
}

export function usageTable(points: { label: string; booking: number; parcel: number; customer: number }[]): ChartTable {
  return {
    columns: ["Jour", "Réservations", "Colis", "Clients"],
    rows: points.map((p) => [p.label, String(p.booking), String(p.parcel), String(p.customer)]),
  };
}

export function serviceLatencyTable(services: { name: string; responseTimeMs: number; status: ServiceHealth["status"] }[]): ChartTable {
  return {
    columns: ["Service", "Réponse (ms)", "Statut"],
    rows: services.map((s) => [s.name, s.status === "down" ? "—" : String(s.responseTimeMs), serviceStatusBadge(s.status).label]),
  };
}
