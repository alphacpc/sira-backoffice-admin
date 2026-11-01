export const PRE_COOKIE = "sira_bo_pre";
export const SESSION_COOKIE = "sira_bo_session";
export const DEMO_ID = "admin@sira.app";
export const DEMO_PASSWORD = "sira-demo";
export const DEMO_TOTP = "123456";
export const PRE_TTL_S = 300;
export const SESSION_TTL_S = 8 * 3600;

export const MAX_TOTP_ATTEMPTS = 5;

export function getSecret(): string {
  const secret = process.env.BACKOFFICE_SESSION_SECRET;
  if (process.env.NODE_ENV === "production") {
    if (!secret || secret.length < 32) {
      throw new Error("BACKOFFICE_SESSION_SECRET must be set to at least 32 characters in production");
    }
    return secret;
  }
  return secret || "dev-only-insecure-backoffice-secret";
}
