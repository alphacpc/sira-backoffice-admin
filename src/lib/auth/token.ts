export interface TokenPayload {
  sub: string;
  stage: "pre" | "full";
  exp: number;
  attempts?: number;
  /** Live mode: the platform's pre-authentication token (stage « pre »). */
  pat?: string;
  /** Live mode: the server-side platform session (stage « full »). */
  sid?: string;
}

const enc = new TextEncoder();

function b64url(bytes: Uint8Array): string {
  let s = "";
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromB64url(s: string): Uint8Array<ArrayBuffer> {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"],
  );
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(body));
  return `${body}.${b64url(new Uint8Array(sig))}`;
}

export async function verifyToken(
  token: string, secret: string, now: number = Date.now(),
): Promise<TokenPayload | null> {
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  try {
    const ok = await crypto.subtle.verify(
      "HMAC", await hmacKey(secret), fromB64url(parts[1]), enc.encode(parts[0]),
    );
    if (!ok) return null;
    const payload = JSON.parse(new TextDecoder().decode(fromB64url(parts[0]))) as TokenPayload;
    if (typeof payload.exp !== "number" || payload.exp * 1000 <= now) return null;
    if (payload.stage !== "pre" && payload.stage !== "full") return null;
    if (
      payload.attempts !== undefined &&
      (!Number.isInteger(payload.attempts) || payload.attempts < 0)
    ) return null;
    return payload;
  } catch {
    return null;
  }
}
