import { beforeEach, describe, expect, it } from "vitest";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-11-02T08:00:00.000Z");
const MINUTE = 60_000;
beforeEach(() => resetStore(NOW));

const byId = <T extends { id: string }>(list: T[]) => new Map(list.map((x) => [x.id, x]));
const bookingNamed = (name: string) => {
  const found = getStore().bookings.filter((b) => b.passengerName === name);
  expect(found, name).toHaveLength(1);
  return found[0]!;
};

describe("sales seed: references", () => {
  it("links every booking to a trip, a seat map seat and, online, to a client account of the same company scope", () => {
    const s = getStore();
    const trips = byId(s.trips), users = byId(s.users);
    expect(s.bookings.length).toBeGreaterThan(100);
    for (const b of s.bookings) {
      const trip = trips.get(b.tripId);
      expect(trip, b.bookingCode).toBeDefined();
      expect(trip!.companyId).toBe(b.companyId);
      expect(b.amount).toBe(trip!.price);
      expect(b.currency).toBe(trip!.currency);
      const map = s.seatMaps.find((m) => m.tripId === b.tripId)!;
      expect(map.seats.some((x) => x.code === b.seatNumber), b.bookingCode).toBe(true);
      if (b.channel === "online") {
        expect(users.get(b.userId!)?.roleCode).toBe("USER");
        expect(b.passengerName).toBe(users.get(b.userId!)!.displayName);
      } else {
        expect(b.userId).toBeNull();
      }
    }
  });

  it("generates unique, well-formed codes", () => {
    const s = getStore();
    const check = (codes: string[], re: RegExp) => {
      expect(new Set(codes).size).toBe(codes.length);
      for (const c of codes) expect(c).toMatch(re);
    };
    check(s.bookings.map((b) => b.bookingCode), /^BK-[0-9A-Z]{8}$/);
    check(s.transactions.map((t) => t.reference), /^TX-[0-9A-Z]{8}$/);
    check(s.tickets.map((t) => t.ticketCode), /^TK-[0-9A-Z]{8}$/);
  });

  it("keeps ids unique across the four new collections", () => {
    const s = getStore();
    for (const list of [s.paymentMethods, s.bookings, s.transactions, s.tickets]) {
      expect(new Set(list.map((x) => x.id)).size).toBe(list.length);
    }
  });
});

describe("sales seed: seats", () => {
  it("matches the seat map: unpaid active bookings sit on booked seats, paid ones on occupied seats, cancelled ones on free seats", () => {
    const s = getStore();
    for (const b of s.bookings) {
      const seat = s.seatMaps.find((m) => m.tripId === b.tripId)!.seats.find((x) => x.code === b.seatNumber)!;
      const expected = b.status === "cancelled" ? "free" : b.paymentStatus === "paid" ? "occupied" : "booked";
      expect(seat.state, b.bookingCode).toBe(expected);
    }
  });

  it("never gives two active bookings the same seat on a trip", () => {
    const seen = new Set<string>();
    for (const b of getStore().bookings.filter((x) => x.status === "confirmed")) {
      const key = `${b.tripId}/${b.seatNumber}`;
      expect(seen.has(key), key).toBe(false);
      seen.add(key);
    }
  });

  it("leaves Trip.availableSeats equal to the free seats of its map", () => {
    const s = getStore();
    for (const t of s.trips) {
      const map = s.seatMaps.find((m) => m.tripId === t.id)!;
      expect(t.availableSeats).toBe(map.seats.filter((x) => x.state === "free").length);
    }
  });

  it("caps the active bookings of a trip at 6", () => {
    const counts = new Map<string, number>();
    for (const b of getStore().bookings.filter((x) => x.status === "confirmed")) {
      counts.set(b.tripId, (counts.get(b.tripId) ?? 0) + 1);
    }
    expect(counts.size).toBeGreaterThan(10);
    for (const n of counts.values()) expect(n).toBeLessThanOrEqual(6);
  });
});

describe("sales seed: payments and tickets", () => {
  it("gives every paid booking a completed transaction, and every failed one a failed transaction with a reason", () => {
    const s = getStore();
    for (const b of s.bookings) {
      const txs = s.transactions.filter((t) => t.bookingId === b.id);
      if (b.paymentStatus === "paid") expect(txs.some((t) => t.status === "COMPLETED"), b.bookingCode).toBe(true);
      if (b.paymentStatus === "failed") {
        expect(txs).toHaveLength(1);
        expect(txs[0]!.status).toBe("FAILED");
        expect(txs[0]!.failureReason).toBeTruthy();
      }
      if (b.status === "cancelled") expect(txs).toHaveLength(0);
    }
    for (const t of s.transactions) {
      if (t.status !== "FAILED") expect(t.failureReason).toBeNull();
      expect(t.completedAt === null).toBe(t.status === "PENDING");
    }
  });

  it("uses a payment method of the booking's own company", () => {
    const s = getStore();
    const methods = byId(s.paymentMethods), bookings = byId(s.bookings);
    expect(s.transactions.length).toBeGreaterThan(100);
    for (const t of s.transactions) {
      expect(methods.get(t.paymentMethodId)!.companyId).toBe(t.companyId);
      expect(bookings.get(t.bookingId)!.companyId).toBe(t.companyId);
    }
  });

  it("issues each ticket to a paid booking of the same trip and company, at most one per booking", () => {
    const s = getStore();
    const bookings = byId(s.bookings);
    const perBooking = new Map<string, number>();
    for (const t of s.tickets) {
      const b = bookings.get(t.bookingId)!;
      expect(b.paymentStatus).toBe("paid");
      expect([t.tripId, t.companyId, t.seatNumber]).toEqual([b.tripId, b.companyId, b.seatNumber]);
      perBooking.set(t.bookingId, (perBooking.get(t.bookingId) ?? 0) + 1);
    }
    for (const n of perBooking.values()) expect(n).toBe(1);
    // ticketIssued mirrors the existence of a ticket, except for the one seeded gap.
    const paidWithoutTicket = s.bookings.filter((b) => b.paymentStatus === "paid" && !perBooking.has(b.id));
    expect(paidWithoutTicket).toHaveLength(1);
    expect(paidWithoutTicket[0]!.ticketIssued).toBe(false);
    for (const b of s.bookings.filter((x) => perBooking.has(x.id))) expect(b.ticketIssued).toBe(true);
  });

  it("covers every ticket status the flow produces and records scans only on checked-in or used tickets", () => {
    const s = getStore();
    const statuses = new Set(s.tickets.map((t) => t.status));
    expect([...statuses].sort()).toEqual(["CHECKED_IN", "ISSUED", "USED"]);
    for (const t of s.tickets) {
      if (t.status === "ISSUED") expect(t.scans).toEqual([]);
      else expect(t.scans.length).toBeGreaterThan(0);
    }
  });

  it("covers the three cancellation causes and expires an unpaid online booking exactly 30 minutes after its creation", () => {
    const cancelled = getStore().bookings.filter((b) => b.status === "cancelled");
    expect(new Set(cancelled.map((b) => b.cancelReason))).toEqual(new Set(["EXPIRED", "CLIENT", "PLATFORM"]));
    for (const b of cancelled) {
      expect(b.cancelledAt).not.toBeNull();
      if (b.cancelReason === "EXPIRED") {
        expect(Date.parse(b.cancelledAt!) - Date.parse(b.createdAt)).toBe(30 * MINUTE);
        expect(b.channel).toBe("online");
      }
      if (b.cancelReason === "PLATFORM") expect(b.channel).toBe("counter");
    }
    for (const b of getStore().bookings.filter((x) => x.status === "confirmed")) {
      expect(b.cancelledAt).toBeNull();
      expect(b.cancelReason).toBeNull();
    }
  });
});

describe("sales seed: anomalies", () => {
  it("seeds exactly two stuck payments, one amount mismatch and one missing ticket", () => {
    const s = getStore();
    const bookings = byId(s.bookings);
    const stuck = s.transactions.filter((t) => t.status === "PENDING" && NOW.getTime() - Date.parse(t.createdAt) > 30 * MINUTE);
    expect(stuck.map((t) => Math.round((NOW.getTime() - Date.parse(t.createdAt)) / MINUTE)).sort((a, b) => a - b)).toEqual([180, 1560]);
    const mismatched = s.transactions.filter((t) => t.amount !== bookings.get(t.bookingId)!.amount);
    expect(mismatched).toHaveLength(1);
    expect(mismatched[0]!.status).toBe("COMPLETED");
    const ticketed = new Set(s.tickets.map((t) => t.bookingId));
    expect(s.transactions.filter((t) => t.status === "COMPLETED" && !ticketed.has(t.bookingId))).toHaveLength(1);
  });

  it("keeps the other pending payments and unpaid online bookings young (10 minutes at most) so they stay valid during a test run", () => {
    const s = getStore();
    const stuckIds = new Set(
      s.transactions.filter((t) => t.status === "PENDING" && NOW.getTime() - Date.parse(t.createdAt) > 30 * MINUTE).map((t) => t.id),
    );
    const young = s.transactions.filter((t) => t.status === "PENDING" && !stuckIds.has(t.id));
    expect(young.length).toBeGreaterThan(5);
    for (const t of young) expect(NOW.getTime() - Date.parse(t.createdAt)).toBeLessThanOrEqual(10 * MINUTE);
    const unpaidOnline = s.bookings.filter(
      (b) => b.channel === "online" && b.status === "confirmed" && b.paymentStatus !== "paid"
        && !s.transactions.some((t) => t.bookingId === b.id && stuckIds.has(t.id)),
    );
    expect(unpaidOnline.length).toBeGreaterThan(5);
    for (const b of unpaidOnline) expect(NOW.getTime() - Date.parse(b.createdAt)).toBeLessThanOrEqual(11 * MINUTE);
  });
});

describe("sales seed: scenarios", () => {
  it("has one counter booking per E2E scenario", () => {
    const s = getStore();
    const txsOf = (id: string) => s.transactions.filter((t) => t.bookingId === id);

    const cancellable = bookingNamed("Rokhaya Thiaw");
    expect([cancellable.channel, cancellable.status, cancellable.paymentStatus]).toEqual(["counter", "confirmed", "pending"]);
    expect(txsOf(cancellable.id)).toHaveLength(0);

    const inProgress = bookingNamed("Samba Kébé");
    expect([inProgress.channel, inProgress.status, inProgress.paymentStatus]).toEqual(["counter", "confirmed", "pending"]);
    const pending = txsOf(inProgress.id).filter((t) => t.status === "PENDING");
    expect(pending).toHaveLength(1);
    expect(NOW.getTime() - Date.parse(pending[0]!.createdAt)).toBeLessThanOrEqual(10 * MINUTE);

    const paid = bookingNamed("Coumba Lô");
    expect([paid.channel, paid.status, paid.paymentStatus, paid.ticketIssued]).toEqual(["counter", "confirmed", "paid", true]);
    expect(s.tickets.filter((t) => t.bookingId === paid.id)).toHaveLength(1);
    expect(txsOf(paid.id).every((t) => t.amount === paid.amount)).toBe(true);
  });
});

describe("sales seed: payment methods", () => {
  it("gives each active company Orange Money, Wave and cash, with Wave inactive for one company in four", () => {
    const s = getStore();
    for (const c of s.companies) {
      const mine = s.paymentMethods.filter((m) => m.companyId === c.id);
      if (c.status !== "active") { expect(mine).toHaveLength(0); continue; }
      expect(mine.map((m) => m.name)).toEqual(expect.arrayContaining(["Orange Money", "Wave", "Espèces au guichet"]));
      expect(mine.find((m) => m.name === "Espèces au guichet")).toMatchObject({ kind: "CASH", provider: null, active: true });
    }
    const wave = s.paymentMethods.filter((m) => m.name === "Wave");
    expect(wave.some((m) => !m.active)).toBe(true);
    expect(wave.some((m) => m.active)).toBe(true);
    expect(s.paymentMethods.some((m) => m.kind === "CARD")).toBe(true);
  });
});

describe("sales seed: no personal data", () => {
  it("contains no e-mail address and no phone number", () => {
    const s = getStore();
    const text = JSON.stringify([s.paymentMethods, s.bookings, s.transactions, s.tickets]);
    expect(text).not.toMatch(/@/);
    expect(text).not.toMatch(/\+221/);
  });

  it("writes nothing but labels and identifiers to the activity log", () => {
    for (const a of getStore().activity) expect(a.action).not.toMatch(/@|\+221/);
  });
});
