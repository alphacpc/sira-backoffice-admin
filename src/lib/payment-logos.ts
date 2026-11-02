/** Logo of a payment method, guessed from its name or provider; `null` when none is known. */
export function paymentLogo(...names: (string | null | undefined)[]): string | null {
  const text = names.filter(Boolean).join(" ").toLowerCase();
  if (text.includes("wave")) return "/images/payments/wave.png";
  if (text.includes("orange")) return "/images/payments/orange-money-trim.png";
  if (text.includes("visa")) return "/images/payments/visa.png";
  if (text.includes("master")) return "/images/payments/mastercd.png";
  return null;
}
