export function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 1) return "••••";
  return `${value[0]}•••${value.slice(at)}`;
}

export function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 3) return "••••";
  const prefix = value.startsWith("+") ? value.slice(0, 4) : "";
  const rest = value.startsWith("+") ? value.slice(4) : value;
  const restDigits = rest.replace(/\D/g, "");
  return `${prefix}${"•".repeat(Math.max(restDigits.length - 2, 1))}${restDigits.slice(-2)}`;
}
