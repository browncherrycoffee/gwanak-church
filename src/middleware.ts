import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

const PUBLIC_PATHS = ["/login", "/api/auth"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/fonts", "/images", "/manifest.json"];

// 인증이 필요한 경로
const PROTECTED_PATHS = [
  "/members/new",
  "/members/import",
  "/members/backup",
  // pastoral은 페이지 자체 PIN(321791)으로 보호 — admin 쿠키 불필요
];

function isProtectedPath(pathname: string): boolean {
  if (PROTECTED_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) return true;
  if (/^\/members\/[^/]+\/edit(\/.*)?$/.test(pathname)) return true;
  return false;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname.startsWith(p)) ||
    STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const authCookie = request.cookies.get("gwanak-auth");
  if (!authCookie?.value || !(await verifyAuthToken(authCookie.value))) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
