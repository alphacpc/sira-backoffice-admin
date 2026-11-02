"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import {
  DEMO_ID, DEMO_PASSWORD, DEMO_TOTP, MAX_TOTP_ATTEMPTS, PRE_COOKIE, PRE_TTL_S, SESSION_COOKIE,
  SESSION_TTL_S, getSecret,
} from "@/lib/auth/constants";
import { signToken, verifyToken } from "@/lib/auth/token";

type Result = { ok: true } | { ok: false; error: string };

const loginSchema = z.object({ identifiant: z.string().min(1), motDePasse: z.string().min(1) });
const totpSchema = z.string().regex(/^\d{6}$/);

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

const LOCKED_ERROR = "Trop de tentatives, reconnecte-toi";
const now = () => Math.floor(Date.now() / 1000);

export async function login(input: { identifiant: string; motDePasse: string }): Promise<Result> {
  const parsed = loginSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Identifiants invalides" };
  if (parsed.data.identifiant !== DEMO_ID || parsed.data.motDePasse !== DEMO_PASSWORD) {
    return { ok: false, error: "Identifiant ou mot de passe incorrect" };
  }
  const token = await signToken(
    { sub: DEMO_ID, stage: "pre", exp: now() + PRE_TTL_S }, getSecret(),
  );
  (await cookies()).set(PRE_COOKIE, token, cookieOptions(PRE_TTL_S));
  return { ok: true };
}

export async function verifyTotp(code: string): Promise<Result> {
  const jar = await cookies();
  const pre = jar.get(PRE_COOKIE)?.value;
  const payload = pre ? await verifyToken(pre, getSecret()) : null;
  if (!payload || payload.stage !== "pre") return { ok: false, error: "Session de connexion expirée" };
  if ((payload.attempts ?? 0) >= MAX_TOTP_ATTEMPTS) return { ok: false, error: LOCKED_ERROR };
  if (!totpSchema.safeParse(code).success || code !== DEMO_TOTP) {
    const attempts = (payload.attempts ?? 0) + 1;
    // The cookie is kept (re-signed) even when locked: deleting it re-renders the verification page,
    // which redirects and races with the client showing the message; it also lets a client replay an older cookie.
    const remaining = Math.max(1, payload.exp - now());
    const bumped = await signToken({ ...payload, attempts }, getSecret());
    jar.set(PRE_COOKIE, bumped, cookieOptions(remaining));
    return { ok: false, error: attempts >= MAX_TOTP_ATTEMPTS ? LOCKED_ERROR : "Code incorrect" };
  }
  const token = await signToken(
    { sub: payload.sub, stage: "full", exp: now() + SESSION_TTL_S }, getSecret(),
  );
  jar.delete(PRE_COOKIE);
  jar.set(SESSION_COOKIE, token, cookieOptions(SESSION_TTL_S));
  return { ok: true };
}

export async function logout(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/connexion");
}

export async function logoutIdle(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/session-expiree");
}
