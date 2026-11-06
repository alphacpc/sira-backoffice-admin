export function maskEmail(value: string): string {
  if (value.includes("•")) return value; // already masked by the platform
  const at = value.indexOf("@");
  if (at < 1) return "••••";
  return `${value[0]}•••${value.slice(at)}`;
}

export function maskPhone(value: string): string {
  if (value.includes("•")) return value; // already masked by the platform
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

/** Truncates an IPv4 address to its /24 network (`a.b.c.0`); anything else is fully masked. */
export function truncateIp(value: string): string {
  const m = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(value.trim());
  if (!m || m.slice(1).some((part) => Number(part) > 255)) return "••••";
  return `${m[1]}.${m[2]}.${m[3]}.0`;
}
