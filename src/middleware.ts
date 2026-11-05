import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, getSecret } from "@/lib/auth/constants";
import { isPublicPath } from "@/lib/auth/public-paths";
import { verifyToken } from "@/lib/auth/token";

export async function middleware(req: NextRequest) {
  if (isPublicPath(req.nextUrl.pathname)) return NextResponse.next();
  const raw = req.cookies.get(SESSION_COOKIE)?.value;
  const payload = raw ? await verifyToken(raw, getSecret()) : null;
  if (payload && payload.stage === "full") return NextResponse.next();
  const url = req.nextUrl.clone();
  url.pathname = raw ? "/session-expiree" : "/connexion";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|images/).*)"],
};
