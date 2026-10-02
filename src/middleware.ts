import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 1차 관문: 세션 쿠키가 없으면 로그인 화면으로.
// 실제 인증·권한 판단은 모든 API가 DB의 세션·사용자 정보로 다시 수행한다
// (middleware는 Edge 환경이라 DB 조회 없이 쿠키 존재만 확인 — 데이터는 API 뒤에만 있음).
const PUBLIC_PATHS = ["/login", "/api/auth", "/api/cron"];
const STATIC_PREFIXES = ["/_next", "/favicon.ico", "/fonts", "/images", "/manifest.json"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p + "?")) ||
    STATIC_PREFIXES.some((p) => pathname.startsWith(p)) ||
    pathname === "/robots.txt"
  ) {
    return NextResponse.next();
  }

  const session = request.cookies.get("gwanak-session");
  if (!session?.value) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
