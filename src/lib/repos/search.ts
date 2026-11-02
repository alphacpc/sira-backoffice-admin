import { companyStatusBadge } from "@/lib/labels";
import { getStore } from "@/lib/repos/store";
import { matchRank, normalizeText, queryProblem } from "@/lib/search-query";

export const SEARCH_TYPES = [
  "company", "user", "customer", "booking", "ticket", "parcel", "invoice", "bus", "incident", "campaign", "notification",
] as const;
export type SearchType = (typeof SEARCH_TYPES)[number];

export const SEARCH_TYPE_LABELS: Record<SearchType, string> = {
  company: "Compagnies", user: "Comptes plateforme", customer: "Comptes clients", booking: "Réservations",
  ticket: "Billets", parcel: "Colis", invoice: "Factures", bus: "Bus", incident: "Incidents",
  campaign: "Campagnes", notification: "Notifications",
};

/** Client-safe result: a label, a sublabel without personal data, and a link. */
export interface SearchHit { type: SearchType; id: string; label: string; sublabel: string; href: string }
export interface SearchGroup { type: SearchType; label: string; total: number; hits: SearchHit[] }
export interface SearchResult { problem: string | null; groups: SearchGroup[] }

interface Candidate { id: string; label: string; sublabel: string; href: string; fields: string[] }

function companyName(id: string): string {
  return getStore().companies.find((c) => c.id === id)?.name ?? "—";
}

/** Only names, codes and identifiers are listed in `fields`: never an e-mail, a phone, a person's name or a message. */
function candidates(type: SearchType): Candidate[] {
  const s = getStore();
  switch (type) {
    case "company":
      return s.companies.map((c) => ({
        id: c.id, label: c.name, sublabel: companyStatusBadge(c.status).label, href: `/compagnies/${c.id}`,
        fields: [c.name, c.slug, c.registrationNumber, c.ninea],
      }));
    case "user":
      return s.users.map((u) => ({
        id: u.id, label: u.displayName,
        sublabel: `${u.username} · ${s.roles.find((r) => r.code === u.roleCode)?.name ?? u.roleCode}`,
        href: `/utilisateurs/${u.id}`, fields: [u.username, u.displayName],
      }));
    case "customer":
      return s.customers.map((c) => ({
        id: c.id, label: c.name, sublabel: "Compte client", href: `/clients/comptes/${c.id}`, fields: [c.name],
      }));
    case "booking":
      return s.bookings.map((b) => ({
        id: b.id, label: b.bookingCode, sublabel: companyName(b.companyId), href: `/ventes/reservations/${b.id}`, fields: [b.bookingCode],
      }));
    case "ticket":
      return s.tickets.map((t) => ({
        id: t.id, label: t.ticketCode, sublabel: companyName(t.companyId),
        href: `/ventes/billets/${encodeURIComponent(t.ticketCode)}`, fields: [t.ticketCode],
      }));
    case "parcel":
      return s.parcels.map((p) => ({
        id: p.id, label: p.parcelCode, sublabel: companyName(p.companyId), href: `/colis/${p.id}`,
        fields: [p.parcelCode, p.trackingNumber],
      }));
    case "invoice":
      return s.invoices.map((i) => ({
        id: i.id, label: i.number, sublabel: companyName(i.companyId), href: `/facturation/factures/${i.id}`, fields: [i.number],
      }));
    case "bus":
      return s.buses.map((b) => ({
        id: b.id, label: b.busCode, sublabel: companyName(b.companyId), href: `/flotte/bus/${b.id}`, fields: [b.busCode, b.plate],
      }));
    case "incident":
      return s.systemIncidents.map((i) => ({
        id: i.id, label: i.incidentCode, sublabel: i.serviceName, href: `/supervision/incidents/${i.id}`,
        fields: [i.incidentCode, i.title],
      }));
    case "campaign":
      return s.marketingCampaigns.map((c) => ({
        id: c.id, label: c.name, sublabel: companyName(c.companyId), href: `/communication/campagnes/${c.id}`, fields: [c.name],
      }));
    case "notification":
      return s.notifications.map((n) => ({
        id: n.id, label: n.notificationCode, sublabel: companyName(n.companyId), href: `/communication/notifications/${n.id}`,
        fields: [n.notificationCode],
      }));
  }
}

function bestRank(fields: string[], query: string): number | null {
  let best: number | null = null;
  for (const f of fields) {
    const r = matchRank(f, query);
    if (r !== null && (best === null || r < best)) best = r;
  }
  return best;
}

export const searchRepo = {
  /** A query with a problem reads nothing. Groups follow `SEARCH_TYPES`; empty groups are left out. */
  search(raw: string, options: { types?: readonly SearchType[]; limitPerType: number }): SearchResult {
    const problem = queryProblem(raw);
    if (problem) return { problem, groups: [] };
    const query = normalizeText(raw);
    const wanted = options.types ?? SEARCH_TYPES;
    const groups: SearchGroup[] = [];
    for (const type of SEARCH_TYPES) {
      if (!wanted.includes(type)) continue;
      const ranked = candidates(type)
        .flatMap((c) => {
          const rank = bestRank(c.fields, query);
          return rank === null ? [] : [{ c, rank }];
        })
        .sort((a, b) => a.rank - b.rank || a.c.label.localeCompare(b.c.label, "fr") || a.c.id.localeCompare(b.c.id));
      if (ranked.length === 0) continue;
      groups.push({
        type, label: SEARCH_TYPE_LABELS[type], total: ranked.length,
        hits: ranked.slice(0, options.limitPerType).map(({ c }): SearchHit => ({
          type, id: c.id, label: c.label, sublabel: c.sublabel, href: c.href,
        })),
      });
    }
    return { problem: null, groups };
  },
};
