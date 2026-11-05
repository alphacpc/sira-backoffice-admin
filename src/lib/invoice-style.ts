import type { InvoiceTemplate } from "@/lib/types";

export const HEX = /^#[0-9a-fA-F]{6}$/;

/** Colour pairs offered in the template editor. */
export const PALETTES: { name: string; primary: string; accent: string }[] = [
  { name: "Marine et ambre", primary: "#1b2a41", accent: "#f59e0b" },
  { name: "Vert forêt", primary: "#14532d", accent: "#eab308" },
  { name: "Bordeaux", primary: "#7f1d1d", accent: "#d97706" },
  { name: "Ardoise et ciel", primary: "#1e293b", accent: "#0ea5e9" },
  { name: "Prune", primary: "#4c1d95", accent: "#f97316" },
  { name: "Océan", primary: "#0c4a6e", accent: "#14b8a6" },
];

export const DEFAULT_TEMPLATE: InvoiceTemplate = {
  logoDataUrl: null, primaryColor: "#1b2a41", accentColor: "#f59e0b",
  headerNote: "", footerNote: "Merci de votre confiance.", legalMentions: "",
  taxRate: 18, paymentTermsDays: 7, showQr: true,
};

function luminance(hex: string): number {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}
/** Black or white, whichever reads better on `hex`. */
export function readableOn(hex: string): string {
  return luminance(hex) > 0.4 ? "#111827" : "#ffffff";
}
/** Contrast ratio between two colours (WCAG), to warn about unreadable palettes. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}
