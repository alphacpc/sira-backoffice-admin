import { beforeEach, describe, expect, it } from "vitest";
import { validateTemplate, rentalInvoicesRepo, qrFor, templateOf } from "@/lib/repos/rental-invoices";
import { rentalsRepo } from "@/lib/repos/rentals";
import { getStore, resetStore } from "@/lib/repos/store";

const NOW = new Date("2026-06-15T10:00:00Z");
beforeEach(() => resetStore(NOW));

describe("rental invoices", () => {
  it("issues an invoice with the quote and none before", () => {
    const req = getStore().rentals.find((r) => r.status === "REQUESTED")!;
    expect(req.invoiceNumber).toBeNull();
    rentalsRepo.quote(req.id, 236_000, "admin@sira.app", NOW);
    const inv = rentalInvoicesRepo.byNumber(req.invoiceNumber!, NOW)!;
    expect(inv.total).toBe(236_000);
    expect(inv.subtotal + inv.taxAmount).toBe(inv.total);
    expect(inv.status).toBe("TO_PAY");
    expect(new Set(getStore().rentals.map((r) => r.invoiceNumber).filter(Boolean)).size).toBe(getStore().rentals.filter((r) => r.invoiceNumber).length);
  });

  it("follows the payments: partial, then paid, and cancelled with its rental", () => {
    const req = getStore().rentals.find((r) => r.status === "REQUESTED")!;
    rentalsRepo.quote(req.id, 100_000, "a", NOW);
    rentalsRepo.recordPayment(req.id, 30_000, "a", NOW);
    expect(rentalInvoicesRepo.byNumber(req.invoiceNumber!, NOW)!.status).toBe("PARTIAL");
    rentalInvoicesRepo.payInFull(req.invoiceNumber!, "a", NOW);
    const paid = rentalInvoicesRepo.byNumber(req.invoiceNumber!, NOW)!;
    expect(paid.status).toBe("PAID");
    expect(paid.balance).toBe(0);
    expect(() => rentalInvoicesRepo.payInFull(req.invoiceNumber!)).toThrow(/déjà payée/);
    const q = getStore().rentals.find((r) => r.status === "QUOTED")!;
    rentalsRepo.cancel(q.id, "plus besoin", "a", NOW);
    expect(rentalInvoicesRepo.byNumber(q.invoiceNumber!, NOW)!.status).toBe("CANCELLED");
  });

  it("marks an unpaid invoice overdue after its due date", () => {
    const q = getStore().rentals.find((r) => r.status === "QUOTED")!;
    const later = new Date(NOW.getTime() + 60 * 86_400_000);
    expect(rentalInvoicesRepo.byNumber(q.invoiceNumber!, later)!.status).toBe("OVERDUE");
  });

  it("lists invoices by company and status", () => {
    const all = rentalInvoicesRepo.listRows({}, NOW);
    expect(all.length).toBe(getStore().rentals.filter((r) => r.invoiceNumber).length);
    expect(rentalInvoicesRepo.listRows({ status: "PAID" }, NOW).every((i) => i.status === "PAID")).toBe(true);
  });

  it("applies a company's template and rejects unsafe ones", () => {
    const id = getStore().companies.find((c) => getStore().invoiceTemplates[c.id])!.id;
    const t = { ...templateOf(id), primaryColor: "#0c4a6e", taxRate: 0 };
    rentalInvoicesRepo.saveTemplate(id, t, "a", NOW);
    expect(templateOf(id).primaryColor).toBe("#0c4a6e");
    const base = templateOf(id);
    expect(() => validateTemplate({ ...base, primaryColor: "red" })).toThrow(/#rrggbb/);
    expect(() => validateTemplate({ ...base, taxRate: 80 })).toThrow(/TVA/);
    expect(() => validateTemplate({ ...base, logoDataUrl: "data:text/html;base64,AAAA" })).toThrow(/logo/i);
    expect(() => validateTemplate({ ...base, logoDataUrl: `data:image/png;base64,${"A".repeat(400_001)}` })).toThrow(/lourd/);
    expect(validateTemplate({ ...base, logoDataUrl: "data:image/png;base64,iVBORw0KGgo=" }).logoDataUrl).toContain("image/png");
  });

  it("draws a scannable payment QR as a PNG", async () => {
    expect(await qrFor("https://pay.sira.app/f/FAC-LOC-0001", "#1b2a41")).toMatch(/^data:image\/png;base64,/);
  });
});
