import QRCode from "qrcode";
import { addActivity } from "@/lib/repos/activity";
import { DEFAULT_TEMPLATE, HEX, readableOn } from "@/lib/invoice-style";
import { maskPhone } from "@/lib/mask";
import { RENTAL_PURPOSES, rentalsRepo } from "@/lib/repos/rentals";
import { getStore } from "@/lib/repos/store";
import type { InvoiceTemplate, Rental } from "@/lib/types";

const DAY = 86_400_000;
export type RentalInvoiceStatus = "TO_PAY" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELLED";

export interface InvoiceParty { name: string; lines: string[] }
export interface RentalInvoice {
  number: string; rentalId: string; rentalCode: string; companyId: string;
  issuer: InvoiceParty & { ninea: string; registration: string };
  customer: InvoiceParty;
  lines: { label: string; detail: string; amount: number }[];
  subtotal: number; taxRate: number; taxAmount: number; total: number;
  paid: number; balance: number; cautionAmount: number; currency: string;
  issuedAt: string; dueAt: string; status: RentalInvoiceStatus;
  payLink: string; template: InvoiceTemplate;
}
export interface RentalInvoiceRow {
  number: string; rentalId: string; rentalCode: string; companyId: string; companyName: string; customerName: string;
  issuedAt: string; dueAt: string; total: number; balance: number; currency: string; status: RentalInvoiceStatus;
}

export const INVOICE_STATUS: Record<RentalInvoiceStatus, { label: string; tone: "warning" | "info" | "success" | "danger" | "neutral" }> = {
  TO_PAY: { label: "À payer", tone: "warning" }, PARTIAL: { label: "Acompte reçu", tone: "info" }, PAID: { label: "Payée", tone: "success" },
  OVERDUE: { label: "En retard", tone: "danger" }, CANCELLED: { label: "Annulée", tone: "neutral" },
};

export function templateOf(companyId: string): InvoiceTemplate {
  return { ...DEFAULT_TEMPLATE, ...(getStore().invoiceTemplates[companyId] ?? {}) };
}

export function validateTemplate(t: InvoiceTemplate): InvoiceTemplate {
  if (!HEX.test(t.primaryColor) || !HEX.test(t.accentColor)) throw new Error("Les couleurs doivent être au format #rrggbb");
  if (!Number.isFinite(t.taxRate) || t.taxRate < 0 || t.taxRate > 30) throw new Error("Le taux de TVA doit être compris entre 0 et 30 %");
  if (!Number.isInteger(t.paymentTermsDays) || t.paymentTermsDays < 0 || t.paymentTermsDays > 90) throw new Error("Le délai de paiement doit être compris entre 0 et 90 jours");
  if (t.headerNote.length > 120) throw new Error("Le sous-titre est limité à 120 caractères");
  if (t.footerNote.length > 300) throw new Error("Le message de pied de page est limité à 300 caractères");
  if (t.legalMentions.length > 600) throw new Error("Les mentions légales sont limitées à 600 caractères");
  if (t.logoDataUrl !== null) {
    if (!/^data:image\/(png|jpeg|webp|svg\+xml);base64,[A-Za-z0-9+/=]+$/.test(t.logoDataUrl)) throw new Error("Le logo doit être une image PNG, JPEG, WebP ou SVG");
    if (t.logoDataUrl.length > 400_000) throw new Error("Le logo est trop lourd (300 Ko maximum)");
  }
  return { ...t, headerNote: t.headerNote.trim(), footerNote: t.footerNote.trim(), legalMentions: t.legalMentions.trim(), showQr: Boolean(t.showQr) };
}

function statusOf(r: Rental, total: number, dueAt: string, now: Date): RentalInvoiceStatus {
  if (r.status === "CANCELLED") return "CANCELLED";
  if (r.paidAmount >= total) return "PAID";
  if (Date.parse(dueAt) < now.getTime()) return "OVERDUE";
  return r.paidAmount > 0 ? "PARTIAL" : "TO_PAY";
}

function build(r: Rental, now: Date): RentalInvoice {
  const s = getStore();
  const company = s.companies.find((c) => c.id === r.companyId)!;
  const template = templateOf(r.companyId);
  const total = r.quoteAmount ?? 0;
  const subtotal = template.taxRate > 0 ? Math.round(total / (1 + template.taxRate / 100)) : total;
  const dueAt = new Date(Date.parse(r.invoiceIssuedAt!) + template.paymentTermsDays * DAY).toISOString();
  const trip = r.returnAt ? "aller-retour" : "aller simple";
  return {
    number: r.invoiceNumber!, rentalId: r.id, rentalCode: r.rentalCode, companyId: r.companyId,
    issuer: { name: company.name, lines: [company.contactEmail, company.contactPhone, company.country].filter(Boolean), ninea: company.ninea, registration: company.registrationNumber },
    customer: { name: r.customerName, lines: [maskPhone(r.customerPhone), RENTAL_PURPOSES[r.purpose]] },
    lines: [{
      label: `Location d'un bus avec chauffeur · ${r.pickup} → ${r.destination}`,
      detail: `${trip} · ${r.passengers} passagers · environ ${r.estimatedKm} km · départ le ${r.departure.slice(0, 10)}${r.returnAt ? `, retour le ${r.returnAt.slice(0, 10)}` : ""}`,
      amount: subtotal,
    }],
    subtotal, taxRate: template.taxRate, taxAmount: total - subtotal, total,
    paid: r.paidAmount, balance: Math.max(total - r.paidAmount, 0), cautionAmount: r.cautionAmount, currency: r.currency,
    issuedAt: r.invoiceIssuedAt!, dueAt, status: statusOf(r, total, dueAt, now),
    payLink: `https://pay.sira.app/f/${r.invoiceNumber}`, template,
  };
}

/** QR code of the payment link as a PNG data URL, drawn in the company's colour when it is dark enough to scan. */
export async function qrFor(link: string, color: string): Promise<string> {
  const dark = readableOn(color) === "#ffffff" ? color : "#111827";
  return QRCode.toDataURL(link, { margin: 1, width: 320, errorCorrectionLevel: "M", color: { dark, light: "#ffffff" } });
}

export const rentalInvoicesRepo = {
  listRows(filter: { companyId?: string; status?: RentalInvoiceStatus } = {}, now: Date = new Date()): RentalInvoiceRow[] {
    const s = getStore();
    return s.rentals
      .filter((r) => r.invoiceNumber && (!filter.companyId || r.companyId === filter.companyId))
      .map((r) => build(r, now))
      .filter((i) => !filter.status || i.status === filter.status)
      .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
      .map((i) => ({
        number: i.number, rentalId: i.rentalId, rentalCode: i.rentalCode, companyId: i.companyId,
        companyName: s.companies.find((c) => c.id === i.companyId)?.name ?? "—", customerName: i.customer.name,
        issuedAt: i.issuedAt, dueAt: i.dueAt, total: i.total, balance: i.balance, currency: i.currency, status: i.status,
      }));
  },

  byNumber(number: string, now: Date = new Date()): RentalInvoice | undefined {
    const r = getStore().rentals.find((x) => x.invoiceNumber === number);
    return r ? build(r, now) : undefined;
  },

  /** Simulates the client paying through the payment link: settles the whole remaining balance. */
  payInFull(number: string, actor = "admin@sira.app", now: Date = new Date()): void {
    const r = getStore().rentals.find((x) => x.invoiceNumber === number);
    if (!r) throw new Error("Facture introuvable");
    const left = (r.quoteAmount ?? 0) - r.paidAmount;
    if (left <= 0) throw new Error("Cette facture est déjà payée");
    rentalsRepo.recordPayment(r.id, left, actor, now);
  },

  saveTemplate(companyId: string, template: InvoiceTemplate, actor = "admin@sira.app", now: Date = new Date()): InvoiceTemplate {
    const s = getStore();
    if (!s.companies.some((c) => c.id === companyId)) throw new Error("Compagnie introuvable");
    const clean = validateTemplate(template);
    s.invoiceTemplates[companyId] = clean;
    addActivity(companyId, actor, "Modèle de facture personnalisé", now);
    return clean;
  },
};

export function toSheetData(i: RentalInvoice): import("@/components/sales/invoice-sheet").InvoiceSheetData {
  return {
    number: i.number, rentalCode: i.rentalCode, currency: i.currency, issuer: i.issuer, customer: i.customer, lines: i.lines,
    subtotal: i.subtotal, taxRate: i.taxRate, taxAmount: i.taxAmount, total: i.total, paid: i.paid, balance: i.balance,
    cautionAmount: i.cautionAmount, issuedAt: i.issuedAt, dueAt: i.dueAt, statusLabel: INVOICE_STATUS[i.status].label, payLink: i.payLink,
  };
}

/** A made-up invoice in the company's identity, shown while editing its template. */
export function sampleInvoiceFor(companyId: string, template: InvoiceTemplate, now: Date = new Date()): import("@/components/sales/invoice-sheet").InvoiceSheetData {
  const company = getStore().companies.find((c) => c.id === companyId);
  if (!company) throw new Error("Compagnie introuvable");
  const total = 236_000;
  const subtotal = template.taxRate > 0 ? Math.round(total / (1 + template.taxRate / 100)) : total;
  return {
    number: "FAC-LOC-0000", rentalCode: "LOC-EXEMPLE", currency: company.currency,
    issuer: { name: company.name, lines: [company.contactEmail, company.contactPhone, company.country].filter(Boolean), ninea: company.ninea, registration: company.registrationNumber },
    customer: { name: "Famille Ndiaye", lines: ["+221•••••••12", "Mariage"] },
    lines: [{ label: "Location d'un bus avec chauffeur · Dakar → Saint-Louis", detail: "aller-retour · 48 passagers · environ 270 km", amount: subtotal }],
    subtotal, taxRate: template.taxRate, taxAmount: total - subtotal, total, paid: 70_800, balance: total - 70_800, cautionAmount: 23_600,
    issuedAt: now.toISOString(), dueAt: new Date(now.getTime() + template.paymentTermsDays * DAY).toISOString(), statusLabel: "Acompte reçu",
    payLink: "https://pay.sira.app/f/FAC-LOC-0000",
  };
}
