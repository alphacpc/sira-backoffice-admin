import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { verifyToken } from "@/lib/auth/token";

export async function middleware(req: NextRequest) {
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (payload && payload.stage === "full") return NextResponse.next();
  const target = raw ? "/session-expiree" : "/connexion";
  return NextResponse.redirect(new URL(target, req.url));
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|connexion|session-expiree|acces-refuse).*)"],
};
