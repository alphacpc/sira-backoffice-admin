export function maskEmail(value: string): string {
  const at = value.indexOf("@");
  if (at < 1) return "••••";
  return `${value[0]}•••${value.slice(at)}`;
}

export function maskPhone(value: string): string {
  const cleaned = value.replace(/[\s\-.()]/g, "");
  const digits = cleaned.replace(/\D/g, "");
  if (digits.length < 3) return "••••";
  const tail = digits.slice(-2);
  if (cleaned.startsWith("+") && digits.length - 3 >= 6) {
    const prefix = digits.slice(0, 3);
    return `+${prefix}${"•".repeat(digits.length - 3 - 2)}${tail}`;
  }
  return `${"•".repeat(digits.length - 2)}${tail}`;
}
