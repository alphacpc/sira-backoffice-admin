export const PRE_COOKIE = "sira_bo_pre";
export const SESSION_COOKIE = "sira_bo_session";
export const DEMO_ID = "admin@sira.app";
export const DEMO_PASSWORD = "sira-demo";
export const DEMO_TOTP = "123456";
export const PRE_TTL_S = 300;
export const SESSION_TTL_S = 8 * 3600;

export function getSecret(): string {
  return process.env.BACKOFFICE_SESSION_SECRET ?? "dev-only-insecure-backoffice-secret";
}
