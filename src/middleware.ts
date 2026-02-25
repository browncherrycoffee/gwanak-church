import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/fonts", "/images", "/manifest.json"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("gwanak-auth");
  if (!authCookie?.value || !verifyAuthToken(authCookie.value)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
