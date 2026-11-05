import { addActivity } from "@/lib/repos/activity";
import { maskPhone } from "@/lib/mask";
import { getStore } from "@/lib/repos/store";
import type { Rental, RentalPurpose, RentalStatus } from "@/lib/types";

export const RENTAL_STATUSES = ["REQUESTED", "QUOTED", "CONFIRMED", "COMPLETED", "CANCELLED"] as const satisfies readonly RentalStatus[];
export const RENTAL_PURPOSES: Record<RentalPurpose, string> = {
  WEDDING: "Mariage", SCHOOL: "Sortie scolaire", SPORT: "Équipe sportive", BUSINESS: "Entreprise", PILGRIMAGE: "Pèlerinage", OTHER: "Autre",
};
export type RentalPayment = "none" | "deposit" | "settled";
const DAY = 86_400_000;

/** Client-safe projection: the phone is masked, bus and driver are resolved to labels. */
export interface RentalRow {
  id: string; rentalCode: string; companyId: string; companyName: string;
  customerName: string; customerPhone: string; purpose: RentalPurpose; passengers: number;
  pickup: string; destination: string; departure: string; returnAt: string | null; estimatedKm: number;
  busId: string | null; busLabel: string | null; driverId: string | null; driverName: string | null;
  status: RentalStatus; quoteAmount: number | null; currency: string;
  depositRequired: number; cautionAmount: number; paidAmount: number; balance: number; payment: RentalPayment;
  /** Other active rentals that use the same bus or driver over the same dates. */
  conflicts: string[];
  invoiceNumber: string | null;
  createdAt: string; cancelledAt: string | null; cancelReason: string | null;
}
export interface RentalDetail {
  rental: RentalRow;
  payments: Rental["payments"]; history: Rental["history"];
  /** Buses and drivers of the company that can still be assigned. */
  buses: { id: string; label: string; seats: number }[];
  drivers: { id: string; name: string }[];
  nextActions: ("quote" | "assign" | "pay" | "confirm" | "complete" | "cancel")[];
}

/** The rental's time window; a one-way trip is held for one day. */
function window(r: Rental): [number, number] {
  const from = Date.parse(r.departure);
  return [from, r.returnAt ? Date.parse(r.returnAt) : from + DAY];
}
const live = (r: Rental) => r.status === "QUOTED" || r.status === "CONFIRMED";
const overlaps = (a: Rental, b: Rental) => { const [a1, a2] = window(a); const [b1, b2] = window(b); return a1 < b2 && b1 < a2; };

function conflictsOf(r: Rental, all: Rental[]): string[] {
  if (!live(r)) return [];
  return all
    .filter((o) => o.id !== r.id && live(o) && overlaps(r, o) && ((r.busId && o.busId === r.busId) || (r.driverId && o.driverId === r.driverId)))
    .map((o) => o.rentalCode);
}

function row(r: Rental): RentalRow {
  const s = getStore();
  const bus = r.busId ? s.buses.find((b) => b.id === r.busId) : undefined;
  const quote = r.quoteAmount ?? 0;
  return {
    id: r.id, rentalCode: r.rentalCode, companyId: r.companyId, companyName: s.companies.find((c) => c.id === r.companyId)?.name ?? "—",
    customerName: r.customerName, customerPhone: maskPhone(r.customerPhone), purpose: r.purpose, passengers: r.passengers,
    pickup: r.pickup, destination: r.destination, departure: r.departure, returnAt: r.returnAt, estimatedKm: r.estimatedKm,
    busId: r.busId, busLabel: bus ? `${bus.plate} · ${bus.brand} ${bus.model}` : null,
    driverId: r.driverId, driverName: s.crew.find((c) => c.id === r.driverId)?.name ?? null,
    status: r.status, quoteAmount: r.quoteAmount, currency: r.currency, depositRequired: r.depositRequired,
    cautionAmount: r.cautionAmount, paidAmount: r.paidAmount, balance: Math.max(quote - r.paidAmount, 0),
    payment: r.paidAmount <= 0 ? "none" : quote > 0 && r.paidAmount >= quote ? "settled" : "deposit",
    conflicts: conflictsOf(r, s.rentals), invoiceNumber: r.invoiceNumber, createdAt: r.createdAt, cancelledAt: r.cancelledAt, cancelReason: r.cancelReason,
  };
}

function find(id: string): Rental {
  const r = getStore().rentals.find((x) => x.id === id);
  if (!r) throw new Error("Location introuvable");
  return r;
}
function log(r: Rental, label: string, actor: string, now: Date): void {
  r.history.push({ at: now.toISOString(), label, actor });
  addActivity(r.companyId, actor, `Location ${r.rentalCode} : ${label.toLowerCase()}`, now);
}
function need(r: Rental, ...allowed: RentalStatus[]): void {
  if (!allowed.includes(r.status)) throw new Error("Cette action n'est pas possible dans l'état actuel de la location");
}

export const rentalsRepo = {
  listRows(filter: { companyId?: string; status?: RentalStatus } = {}): RentalRow[] {
    return getStore().rentals
      .filter((r) => (!filter.companyId || r.companyId === filter.companyId) && (!filter.status || r.status === filter.status))
      .sort((a, b) => b.departure.localeCompare(a.departure))
      .map(row);
  },

  detail(id: string): RentalDetail | undefined {
    const s = getStore();
    const r = s.rentals.find((x) => x.id === id);
    if (!r) return undefined;
    const rr = row(r);
    const open = r.status !== "COMPLETED" && r.status !== "CANCELLED";
    const next: RentalDetail["nextActions"] = [];
    if (r.status === "REQUESTED") next.push("quote");
    if (r.status === "QUOTED" || r.status === "CONFIRMED") next.push("assign", "pay");
    if (r.status === "QUOTED") next.push("confirm");
    if (r.status === "CONFIRMED") next.push("complete");
    if (open) next.push("cancel");
    return {
      rental: rr, payments: [...r.payments], history: [...r.history],
      buses: s.buses.filter((b) => b.companyId === r.companyId && b.status !== "retired" && b.seatCapacity >= r.passengers)
        .map((b) => ({ id: b.id, label: `${b.plate} · ${b.brand} ${b.model}`, seats: b.seatCapacity })),
      drivers: s.crew.filter((c) => c.companyId === r.companyId && c.role === "DRIVER").map((c) => ({ id: c.id, name: c.name })),
      nextActions: next,
    };
  },

  /** REQUESTED → QUOTED: sets the price; the deposit is 30 % of it and the caution 10 %. */
  quote(id: string, amount: number, actor = "admin@sira.app", now: Date = new Date()): Rental {
    const r = find(id);
    need(r, "REQUESTED");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Le montant du devis doit être positif");
    r.quoteAmount = Math.round(amount);
    r.depositRequired = Math.round(r.quoteAmount * 0.3);
    r.cautionAmount = Math.round(r.quoteAmount * 0.1);
    r.status = "QUOTED";
    if (!r.invoiceNumber) {
      const next = Math.max(0, ...getStore().rentals.map((x) => Number(x.invoiceNumber?.slice(-4)) || 0)) + 1;
      r.invoiceNumber = `FAC-LOC-${String(next).padStart(4, "0")}`;
      r.invoiceIssuedAt = now.toISOString();
    }
    log(r, `Devis et facture ${r.invoiceNumber} envoyés (${r.quoteAmount} ${r.currency})`, actor, now);
    return r;
  },

  /** Picks the bus and the driver; refuses a bus that is too small, foreign, retired, or already booked on those dates. */
  assign(id: string, busId: string, driverId: string, actor = "admin@sira.app", now: Date = new Date()): Rental {
    const s = getStore();
    const r = find(id);
    need(r, "QUOTED", "CONFIRMED");
    const bus = s.buses.find((b) => b.id === busId && b.companyId === r.companyId);
    if (!bus || bus.status === "retired") throw new Error("Bus introuvable pour cette compagnie");
    if (bus.seatCapacity < r.passengers) throw new Error(`Ce bus a ${bus.seatCapacity} places pour ${r.passengers} passagers`);
    if (!s.crew.some((c) => c.id === driverId && c.companyId === r.companyId && c.role === "DRIVER")) throw new Error("Chauffeur introuvable pour cette compagnie");
    const clash = s.rentals.find((o) => o.id !== r.id && o.status === "CONFIRMED" && overlaps(r, o) && (o.busId === busId || o.driverId === driverId));
    if (clash) throw new Error(`Bus ou chauffeur déjà pris par la location ${clash.rentalCode} à ces dates`);
    r.busId = busId; r.driverId = driverId;
    log(r, "Bus et chauffeur affectés", actor, now);
    return r;
  },

  recordPayment(id: string, amount: number, actor = "admin@sira.app", now: Date = new Date()): Rental {
    const r = find(id);
    need(r, "QUOTED", "CONFIRMED");
    if (!Number.isFinite(amount) || amount <= 0) throw new Error("Le montant doit être positif");
    const left = (r.quoteAmount ?? 0) - r.paidAmount;
    if (amount > left) throw new Error(`Le montant dépasse le solde restant (${left} ${r.currency})`);
    r.paidAmount += Math.round(amount);
    r.payments.push({ at: now.toISOString(), amount: Math.round(amount) });
    log(r, `Paiement de ${Math.round(amount)} ${r.currency} enregistré`, actor, now);
    return r;
  },

  /** QUOTED → CONFIRMED: needs a bus, a driver and the deposit. */
  confirm(id: string, actor = "admin@sira.app", now: Date = new Date()): Rental {
    const r = find(id);
    need(r, "QUOTED");
    if (!r.busId || !r.driverId) throw new Error("Affectez un bus et un chauffeur avant de confirmer");
    if (r.paidAmount < r.depositRequired) throw new Error(`L'acompte de ${r.depositRequired} ${r.currency} n'est pas encore versé`);
    r.status = "CONFIRMED";
    log(r, "Location confirmée", actor, now);
    return r;
  },

  /** CONFIRMED → COMPLETED: the balance must be settled. */
  complete(id: string, actor = "admin@sira.app", now: Date = new Date()): Rental {
    const r = find(id);
    need(r, "CONFIRMED");
    if (r.paidAmount < (r.quoteAmount ?? 0)) throw new Error("Le solde doit être payé avant de terminer la location");
    r.status = "COMPLETED";
    log(r, "Location terminée", actor, now);
    return r;
  },

  cancel(id: string, reason: string, actor = "admin@sira.app", now: Date = new Date()): Rental {
    const r = find(id);
    need(r, "REQUESTED", "QUOTED", "CONFIRMED");
    const motif = reason.trim();
    if (!motif) throw new Error("Un motif est obligatoire");
    if (Date.parse(r.departure) <= now.getTime()) throw new Error("Une location déjà partie ne peut plus être annulée");
    r.status = "CANCELLED"; r.cancelledAt = now.toISOString(); r.cancelReason = motif;
    log(r, `Location annulée. Motif : ${motif}`, actor, now);
    return r;
  },
};
