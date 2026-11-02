const number = new Intl.NumberFormat("fr-FR");

export function formatNumber(n: number): string {
  return number.format(n);
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency", currency, maximumFractionDigits: currency === "XOF" ? 0 : 2,
  }).format(amount);
}

export function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC",
  }).format(d);
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit", timeZone: "UTC",
  }).format(d);
}

/** Next billing date to display: none once the subscription is canceled or expired. */
export function nextBillingLabel(status: string, date: string): string {
  return status === "canceled" || status === "expired" ? "—" : formatDate(date);
}

/** A number of days written out: "1 jour", "20 jours", "3 mois", "1 an 2 mois", "2 ans". */
export function formatDuration(days: number): string {
  const d = Math.max(0, Math.floor(days));
  if (d < 30) return `${d} jour${d > 1 ? "s" : ""}`;
  if (d < 365) {
    const months = Math.floor(d / 30);
    return `${months} mois`;
  }
  const years = Math.floor(d / 365);
  const months = Math.floor((d % 365) / 30);
  const y = `${years} an${years > 1 ? "s" : ""}`;
  return months > 0 ? `${y} ${months} mois` : y;
}
