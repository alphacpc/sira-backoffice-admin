import { beforeEach, describe, expect, it } from "vitest";
import {
  bookingsRepo, cancelBlockReason, onlineRepo, paymentMethodsRepo, ticketsRepo, transactionAnomalies, transactionsRepo,
} from "@/lib/repos/sales";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const MINUTE = 60_000;
beforeEach(() => resetStore(NOW));

const bookingNamed = (name: string) => getStore().bookings.find((b) => b.passengerName === name)!;

describe("booking list", () => {
  it("lists every booking newest first, with a deterministic tie-break", () => {
    const rows = bookingsRepo.listRows({});
    expect(rows).toHaveLength(getStore().bookings.length);
    for (let i = 1; i < rows.length; i++) {
      const [a, b] = [rows[i - 1]!, rows[i]!];
      expect(a.createdAt >= b.createdAt).toBe(true);
    }
  });

  it("filters by company, status, payment status and channel, and combines the filters", () => {
    const s = getStore();
    const companyId = s.bookings[0]!.companyId;
    expect(bookingsRepo.listRows({ companyId }).every((r) => r.companyId === companyId)).toBe(true);
    expect(bookingsRepo.listRows({ companyId }).length).toBeGreaterThan(0);
    const cancelled = bookingsRepo.listRows({ status: "cancelled" });
    expect(cancelled.length).toBeGreaterThan(0);
    expect(cancelled.every((r) => r.status === "cancelled")).toBe(true);
    const failed = bookingsRepo.listRows({ paymentStatus: "failed" });
    expect(failed.length).toBeGreaterThan(0);
    expect(failed.every((r) => r.paymentStatus === "failed")).toBe(true);
    const counter = bookingsRepo.listRows({ channel: "counter" });
    expect(counter.every((r) => r.channel === "counter")).toBe(true);
    const both = bookingsRepo.listRows({ channel: "counter", paymentStatus: "paid" });
    expect(both.length).toBeGreaterThan(0);
    expect(both.every((r) => r.channel === "counter" && r.paymentStatus === "paid")).toBe(true);
    expect(both.length).toBeLessThan(counter.length);
  });

  it("exposes only client-safe fields", () => {
    const row = bookingsRepo.listRows({})[0]!;
    expect(Object.keys(row).sort()).toEqual([
      "amount", "bookingCode", "channel", "companyId", "companyName", "createdAt", "currency", "departure", "id",
      "passengerName", "paymentStatus", "routeLabel", "seatNumber", "status",
    ]);
    expect(row.routeLabel).toMatch(/→/);
  });
});

describe("booking detail", () => {
  it("returns undefined for an unknown booking", () => {
    expect(bookingsRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
  });

  it("builds an ordered timeline for a paid booking", () => {
    const d = bookingsRepo.detail(bookingNamed("Coumba Lô").id, NOW)!;
    expect(d.companyName).not.toBe("—");
    expect(d.routeLabel).toMatch(/→/);
    expect(d.transactions).toHaveLength(1);
    expect(d.tickets).toHaveLength(1);
    const labels = d.timeline.map((e) => e.label);
    expect(labels[0]).toBe("Réservation créée au guichet");
    expect(labels).toContain("Paiement lancé (Espèces au guichet)");
    expect(labels).toContain("Paiement réussi");
    expect(labels).toContain(`Billet ${d.tickets[0]!.ticketCode} émis`);
    for (let i = 1; i < d.timeline.length; i++) expect(d.timeline[i - 1]!.at <= d.timeline[i]!.at).toBe(true);
  });

  it("records the failure reason, the scans and the cancellation cause in the timeline", () => {
    const s = getStore();
    const failedBooking = s.bookings.find((b) => b.paymentStatus === "failed")!;
    const failedTx = s.transactions.find((t) => t.bookingId === failedBooking.id)!;
    expect(bookingsRepo.detail(failedBooking.id, NOW)!.timeline.map((e) => e.label))
      .toContain(`Paiement échoué : ${failedTx.failureReason}`);

    const scanned = s.tickets.find((t) => t.scans.length > 0)!;
    expect(bookingsRepo.detail(scanned.bookingId, NOW)!.timeline.map((e) => e.label))
      .toContain(`Billet ${scanned.ticketCode} scanné`);

    const expired = s.bookings.find((b) => b.cancelReason === "EXPIRED")!;
    const last = bookingsRepo.detail(expired.id, NOW)!.timeline.at(-1)!;
    expect(last.label).toBe("Réservation annulée : Expirée (non payée à temps)");
    expect(last.at).toBe(expired.cancelledAt);
  });

  it("explains why a booking cannot be cancelled", () => {
    expect(cancelBlockReason(bookingNamed("Rokhaya Thiaw"))).toBeNull();
    expect(cancelBlockReason(bookingNamed("Samba Kébé"))).toBe("Un paiement est en cours sur cette réservation");
    expect(cancelBlockReason(bookingNamed("Coumba Lô"))).toBe("Une réservation payée ne peut pas être annulée");
    const cancelled = getStore().bookings.find((b) => b.status === "cancelled")!;
    expect(cancelBlockReason(cancelled)).toBe("Cette réservation est déjà annulée");
    const failed = getStore().bookings.find((b) => b.paymentStatus === "failed" && b.status === "confirmed")!;
    expect(cancelBlockReason(failed)).toBeNull();
    expect(bookingsRepo.detail(bookingNamed("Samba Kébé").id, NOW)!.cancelBlockedReason)
      .toBe("Un paiement est en cours sur cette réservation");
  });
});

describe("payment anomalies", () => {
  it("flags exactly the four seeded anomalies", () => {
    const rows = transactionsRepo.listRows({ anomalyOnly: true }, NOW);
    expect(rows).toHaveLength(4);
    const kinds = rows.flatMap((r) => r.anomalies).sort();
    expect(kinds).toEqual(["AMOUNT_MISMATCH", "MISSING_TICKET", "STUCK", "STUCK"]);
    expect(transactionsRepo.listRows({}, NOW).filter((r) => r.anomalies.length > 0)).toHaveLength(4);
  });

  it("treats a pending payment as stuck only after strictly more than 30 minutes", () => {
    const tx = getStore().transactions.find((t) => t.status === "PENDING" && NOW.getTime() - Date.parse(t.createdAt) < 11 * MINUTE)!;
    const at = (ms: number) => ({ ...tx, createdAt: new Date(NOW.getTime() - ms).toISOString() });
    expect(transactionAnomalies(at(30 * MINUTE), NOW)).not.toContain("STUCK");
    expect(transactionAnomalies(at(30 * MINUTE + 1), NOW)).toContain("STUCK");
    // The clock is injected: the same payment is stuck two hours later.
    expect(transactionAnomalies(tx, new Date(NOW.getTime() + 2 * 60 * MINUTE))).toContain("STUCK");
    expect(transactionAnomalies(tx, NOW)).not.toContain("STUCK");
  });

  it("never flags a completed or failed payment as stuck", () => {
    const old = new Date(NOW.getTime() + 24 * 60 * MINUTE * 30);
    for (const t of getStore().transactions.filter((x) => x.status !== "PENDING")) {
      expect(transactionAnomalies(t, old)).not.toContain("STUCK");
    }
  });
});

describe("transactions", () => {
  it("filters by status and company and exposes only client-safe fields", () => {
    const s = getStore();
    const completed = transactionsRepo.listRows({ status: "COMPLETED" }, NOW);
    expect(completed.length).toBeGreaterThan(0);
    expect(completed.every((r) => r.status === "COMPLETED")).toBe(true);
    const companyId = s.transactions[0]!.companyId;
    expect(transactionsRepo.listRows({ companyId }, NOW).every((r) => r.companyId === companyId)).toBe(true);
    expect(Object.keys(completed[0]!).sort()).toEqual([
      "amount", "anomalies", "bookingCode", "bookingId", "companyId", "companyName", "completedAt", "createdAt",
      "currency", "failureReason", "id", "methodName", "passengerName", "reference", "status",
    ]);
  });

  it("returns a detail with the booking and one explanation per anomaly, undefined when unknown", () => {
    const stuck = transactionsRepo.listRows({ anomalyOnly: true }, NOW).find((r) => r.anomalies.includes("STUCK"))!;
    const d = transactionsRepo.detail(stuck.id, NOW)!;
    expect(d.transaction.reference).toBe(stuck.reference);
    expect(d.booking.bookingCode).toBe(stuck.bookingCode);
    expect(d.anomalies).toEqual([{
      kind: "STUCK", label: "Paiement bloqué",
      explanation: "Le paiement est en attente depuis plus de 30 minutes sans résultat du fournisseur.",
    }]);
    expect(transactionsRepo.detail("00000000-0000-4000-8000-000000000000", NOW)).toBeUndefined();
  });
});

describe("tickets", () => {
  it("lists and filters tickets, newest first", () => {
    const all = ticketsRepo.listRows({});
    expect(all).toHaveLength(getStore().tickets.length);
    for (let i = 1; i < all.length; i++) expect(all[i - 1]!.issuedAt >= all[i]!.issuedAt).toBe(true);
    const used = ticketsRepo.listRows({ status: "USED" });
    expect(used.length).toBeGreaterThan(0);
    expect(used.every((r) => r.status === "USED" && r.scanCount > 0)).toBe(true);
    expect(Object.keys(all[0]!).sort()).toEqual([
      "amount", "bookingCode", "bookingId", "busPlate", "channel", "companyId", "companyName", "currency", "departure", "id",
      "issuedAt", "passengerName", "paymentStatus", "routeLabel", "scanCount", "seatNumber", "status", "ticketCode",
    ]);
  });

  it("resolves a ticket by code with its scans, undefined when unknown", () => {
    const scanned = getStore().tickets.find((t) => t.scans.length > 0)!;
    const d = ticketsRepo.detailByCode(scanned.ticketCode)!;
    expect(d.ticket.ticketCode).toBe(scanned.ticketCode);
    expect(d.scans).toEqual(scanned.scans);
    expect(ticketsRepo.detailByCode("TK-INCONNU0")).toBeUndefined();
  });
});

describe("payment methods", () => {
  it("counts transactions and computes the success rate over finished payments", () => {
    const s = getStore();
    const rows = paymentMethodsRepo.listRows({});
    expect(rows).toHaveLength(s.paymentMethods.length);
    const withTraffic = rows.find((r) => r.transactions > 0 && r.failed > 0)!;
    const txs = s.transactions.filter((t) => t.paymentMethodId === withTraffic.id);
    expect(withTraffic.transactions).toBe(txs.length);
    expect(withTraffic.completed).toBe(txs.filter((t) => t.status === "COMPLETED").length);
    expect(withTraffic.failed).toBe(txs.filter((t) => t.status === "FAILED").length);
    expect(withTraffic.successRate).toBe(Math.round((withTraffic.completed / (withTraffic.completed + withTraffic.failed)) * 100));
    const idle = rows.find((r) => r.completed + r.failed === 0)!;
    expect(idle.successRate).toBeNull();
    expect(Object.keys(rows[0]!).sort()).toEqual([
      "active", "companyId", "companyName", "completed", "failed", "id", "kind", "name", "provider", "successRate", "transactions",
    ]);
  });

  it("filters by company", () => {
    const companyId = getStore().paymentMethods[0]!.companyId;
    const rows = paymentMethodsRepo.listRows({ companyId });
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((r) => r.companyId === companyId)).toBe(true);
  });
});

describe("online self-service stats", () => {
  it("counts online bookings, conversion, failures, expiries and stuck payments", () => {
    const s = getStore();
    const online = s.bookings.filter((b) => b.channel === "online");
    const stats = onlineRepo.stats(NOW);
    expect(stats.total).toBe(online.length);
    expect(stats.paid).toBe(online.filter((b) => b.paymentStatus === "paid").length);
    expect(stats.conversionPercent).toBe(Math.round((stats.paid / stats.total) * 100));
    expect(stats.expired).toBe(online.filter((b) => b.cancelReason === "EXPIRED").length);
    expect(stats.failedPayments).toBe(
      s.transactions.filter((t) => t.status === "FAILED" && online.some((b) => b.id === t.bookingId)).length,
    );
    expect(stats.stuck).toBe(
      transactionsRepo.listRows({}, NOW).filter((r) => r.anomalies.includes("STUCK") && online.some((b) => b.id === r.bookingId)).length,
    );
  });

  it("lists unpaid online bookings without a pending payment, soonest expiry first, 30 minutes after creation", () => {
    const s = getStore();
    const { expiring } = onlineRepo.stats(NOW);
    expect(expiring.length).toBeGreaterThan(5);
    for (let i = 1; i < expiring.length; i++) expect(expiring[i - 1]!.minutesLeft <= expiring[i]!.minutesLeft).toBe(true);
    for (const e of expiring) {
      const b = s.bookings.find((x) => x.id === e.id)!;
      expect(b.channel).toBe("online");
      expect(b.status).toBe("confirmed");
      expect(b.paymentStatus).not.toBe("paid");
      expect(s.transactions.some((t) => t.bookingId === b.id && t.status === "PENDING")).toBe(false);
      expect(e.minutesLeft).toBe(Math.ceil((Date.parse(b.createdAt) + 30 * MINUTE - NOW.getTime()) / MINUTE));
    }
    expect(Object.keys(expiring[0]!).sort()).toEqual(["amount", "bookingCode", "companyName", "currency", "id", "minutesLeft", "passengerName"]);
  });

  it("reports an expiry that has passed as zero or negative minutes left", () => {
    const later = new Date(NOW.getTime() + 60 * MINUTE);
    const { expiring } = onlineRepo.stats(later);
    expect(expiring.length).toBeGreaterThan(0);
    expect(expiring.every((e) => e.minutesLeft <= 0)).toBe(true);
  });

  it("rounds the remaining minutes up for a partial minute", () => {
    const base = onlineRepo.stats(NOW).expiring;
    const shifted = onlineRepo.stats(new Date(NOW.getTime() + 30_000)).expiring;
    expect(shifted.length).toBe(base.length);
    for (const e of shifted) {
      const before = base.find((x) => x.id === e.id)!;
      // 30 s later, a whole number of minutes left drops by exactly one minute only when ceil is used.
      expect(e.minutesLeft).toBe(before.minutesLeft);
    }
  });
});
