import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";
import { SEARCH_TYPES, SEARCH_TYPE_LABELS, searchRepo, type SearchType } from "@/lib/repos/search";
import { CONTACT_QUERY_MESSAGE, PAGE_LIMIT } from "@/lib/search-query";

const NOW = new Date("2026-11-02T08:00:00.000Z");
beforeEach(() => resetStore(NOW));

const run = (q: string, limitPerType = PAGE_LIMIT, types?: readonly SearchType[]) =>
  searchRepo.search(q, { limitPerType, types });
const group = (q: string, type: SearchType, limit = PAGE_LIMIT) => run(q, limit).groups.find((g) => g.type === type);
const companyName = (id: string) => getStore().companies.find((c) => c.id === id)?.name ?? "—";

describe("search problems", () => {
  it("returns the problem and reads nothing for an unusable query", () => {
    expect(run("a")).toEqual({ problem: "Saisis au moins 2 caractères", groups: [] });
    expect(run("someone@example.sn")).toEqual({ problem: CONTACT_QUERY_MESSAGE, groups: [] });
    expect(run("+221 77 123 45 67").groups).toEqual([]);
  });
  it("returns no problem and no group when nothing matches", () => {
    expect(run("zzzqqqxxx")).toEqual({ problem: null, groups: [] });
  });
});

describe("companies", () => {
  it("finds a company by name, accent- and case-insensitively, linking to its page", () => {
    const company = getStore().companies.find((c) => c.name === "Louga Trans")!;
    const g = group("LOUGA tr", "company")!;
    expect(g.label).toBe("Compagnies");
    expect(g.hits[0]).toEqual({
      type: "company", id: company.id, label: "Louga Trans", sublabel: expect.any(String), href: `/compagnies/${company.id}`,
    });
  });
  it("also finds a company by slug, registration number and NINEA, never by contact data", () => {
    const c = getStore().companies[0]!;
    for (const field of [c.slug, c.registrationNumber, c.ninea]) {
      expect(group(field, "company")!.hits.map((h) => h.id), field).toContain(c.id);
    }
    expect(run(c.contactEmail).groups).toEqual([]);
    expect(run(c.contactPhone).groups).toEqual([]);
  });
});

describe("platform and client accounts", () => {
  it("finds a platform account by username or display name, with the role in the sublabel", () => {
    const u = getStore().users.find((x) => x.roleCode === "ADMIN")!;
    const hit = group(u.username, "user")!.hits.find((h) => h.id === u.id)!;
    expect(hit).toMatchObject({ label: u.displayName, href: `/utilisateurs/${u.id}` });
    expect(hit.sublabel).toBe(`${u.username} · Administrateur`);
    expect(group(u.displayName.split(" ")[0]!, "user")!.hits.map((h) => h.id)).toContain(u.id);
  });
  it("finds the accent-insensitive display name", () => {
    expect(group("aissatou", "user")!.hits.some((h) => h.label === "Aïssatou Sarr")).toBe(true);
  });
  it("never finds an account by e-mail or phone", () => {
    const u = getStore().users[0]!;
    expect(run(u.email).groups).toEqual([]);
    expect(run(u.phone).groups).toEqual([]);
    expect(run(u.email.split("@")[1]!).groups.some((g) => g.type === "user")).toBe(false);
  });
  it("finds a client account by name", () => {
    const c = getStore().customers[0]!;
    const hit = group(c.name, "customer")!.hits.find((h) => h.id === c.id)!;
    expect(hit).toEqual({ type: "customer", id: c.id, label: c.name, sublabel: "Compte client", href: `/clients/comptes/${c.id}` });
  });
});

describe("sales, parcels and billing", () => {
  it("finds a booking by code but never by passenger name", () => {
    const b = getStore().bookings[0]!;
    const hit = group(b.bookingCode, "booking")!.hits.find((h) => h.id === b.id)!;
    expect(hit).toEqual({ type: "booking", id: b.id, label: b.bookingCode, sublabel: companyName(b.companyId), href: `/ventes/reservations/${b.id}` });
    expect(group(b.passengerName, "booking")?.hits.some((h) => h.id === b.id) ?? false).toBe(false);
  });
  it("finds a ticket by code, encoding the code in the link", () => {
    const t = getStore().tickets[0]!;
    const hit = group(t.ticketCode, "ticket")!.hits.find((h) => h.label === t.ticketCode)!;
    expect(hit.href).toBe(`/ventes/billets/${encodeURIComponent(t.ticketCode)}`);
    expect(hit.sublabel).toBe(companyName(t.companyId));
  });
  it("finds a parcel by code or tracking number but never by sender, recipient or phone", () => {
    const p = getStore().parcels[0]!;
    for (const q of [p.parcelCode, p.trackingNumber]) {
      expect(group(q, "parcel")!.hits.find((h) => h.id === p.id), q).toMatchObject({ label: p.parcelCode, href: `/colis/${p.id}` });
    }
    expect(group(p.recipientName, "parcel")?.hits.some((h) => h.id === p.id) ?? false).toBe(false);
    expect(group(p.senderName, "parcel")?.hits.some((h) => h.id === p.id) ?? false).toBe(false);
    expect(run(p.recipientPhone).groups).toEqual([]);
  });
  it("finds an invoice by number and a bus by code or plate", () => {
    const s = getStore();
    const inv = s.invoices[0]!;
    expect(group(inv.number, "invoice")!.hits.find((h) => h.id === inv.id)).toMatchObject({ href: `/facturation/factures/${inv.id}`, sublabel: companyName(inv.companyId) });
    const bus = s.buses[0]!;
    for (const q of [bus.busCode, bus.plate]) {
      expect(group(q, "bus")!.hits.find((h) => h.id === bus.id), q).toMatchObject({ href: `/flotte/bus/${bus.id}` });
    }
  });
});

describe("supervision and communication", () => {
  it("finds an incident by code or title, with the service as sublabel", () => {
    const i = getStore().systemIncidents[0]!;
    for (const q of [i.incidentCode, i.title]) {
      expect(group(q, "incident")!.hits.find((h) => h.id === i.id), q).toMatchObject({ href: `/supervision/incidents/${i.id}`, sublabel: i.serviceName });
    }
  });
  it("finds a campaign by name", () => {
    const c = getStore().marketingCampaigns[0]!;
    expect(group(c.name, "campaign")!.hits.find((h) => h.id === c.id)).toMatchObject({ href: `/communication/campagnes/${c.id}`, sublabel: companyName(c.companyId) });
  });
  it("finds a notification by code but never by content", () => {
    const n = getStore().notifications.find((x) => x.messageContent.length > 15)!;
    expect(group(n.notificationCode, "notification")!.hits.find((h) => h.id === n.id)).toMatchObject({ href: `/communication/notifications/${n.id}` });
    const words = n.messageContent.split(" ").filter((w) => w.length > 6 && !/^[A-Z]{2,3}-/.test(w));
    for (const w of words) expect(run(w).groups.some((g) => g.type === "notification"), w).toBe(false);
  });
});

describe("result shape, order and limits", () => {
  it("returns hits with exactly five fields and group labels from the map", () => {
    const g = group("bk-", "booking")!;
    expect(Object.keys(g.hits[0]!).sort()).toEqual(["href", "id", "label", "sublabel", "type"]);
    expect(Object.keys(g).sort()).toEqual(["hits", "label", "total", "type"]);
    expect(g.label).toBe(SEARCH_TYPE_LABELS.booking);
  });
  it("orders groups like SEARCH_TYPES and omits empty ones", () => {
    const types = run("a-").groups.map((g) => g.type);
    expect(types).toEqual(SEARCH_TYPES.filter((t) => types.includes(t)));
    expect(run("bk-").groups.map((g) => g.type)).toEqual(["booking"]);
  });
  it("sorts hits by rank then label", () => {
    const hits = group("bk-", "booking", 500)!.hits;
    const labels = hits.map((h) => h.label);
    expect(labels).toEqual([...labels].sort((a, b) => a.localeCompare(b, "fr")));
    const mixed = group("express", "company")!.hits;
    const first = mixed[0]!.label.toLowerCase();
    expect(first.startsWith("express") || mixed.every((h) => !h.label.toLowerCase().startsWith("express"))).toBe(true);
  });
  it("limits hits per type but reports the real total", () => {
    const total = getStore().bookings.length;
    expect(total).toBeGreaterThan(4);
    const g = group("bk-", "booking", 4)!;
    expect(g.hits).toHaveLength(4);
    expect(g.total).toBe(total);
    expect(group("bk-", "booking")!.hits).toHaveLength(Math.min(PAGE_LIMIT, total));
  });
  it("restricts to the requested types", () => {
    expect(run("bk-", 4, ["ticket"]).groups).toEqual([]);
    expect(run("bk-", 4, ["booking", "ticket"]).groups.map((g) => g.type)).toEqual(["booking"]);
  });
});

describe("hardening (mutation-driven)", () => {
  it("never matches a fragment of contact data that is not itself contact-like", () => {
    const s = getStore();
    s.companies[0]!.contactEmail = "qqqleakqqq@example.sn";
    s.companies[0]!.contactPhone = "qqqphoneqqq";
    expect(run("qqqleakqqq").groups).toEqual([]);
    expect(run("qqqphoneqqq").groups).toEqual([]);
  });
  it("encodes a ticket code containing reserved characters in its link", () => {
    const s = getStore();
    s.tickets.push({ ...s.tickets[0]!, id: "tk-odd", ticketCode: "ZZQ A/B#1?" });
    const hit = group("zzq a/b", "ticket")!.hits.find((h) => h.id === "tk-odd")!;
    expect(hit.href).toBe("/ventes/billets/ZZQ%20A%2FB%231%3F");
  });
  it("ranks an exact or prefix match before a mere containment, even when the label sorts later", () => {
    const s = getStore();
    s.marketingCampaigns.push(
      { ...s.marketingCampaigns[0]!, id: "c-contains", name: "Aaa xxrankzz" },
      { ...s.marketingCampaigns[0]!, id: "c-prefix", name: "xxrankzz suffixe" },
    );
    const ids = group("xxrankzz", "campaign")!.hits.map((h) => h.id);
    expect(ids).toEqual(["c-prefix", "c-contains"]);
  });
});
