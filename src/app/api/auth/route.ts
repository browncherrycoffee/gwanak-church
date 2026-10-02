import { NextResponse } from "next/server";
import { headers, cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, sessions } from "@/db/schema";
import { checkLoginAllowed, recordLoginAttempt } from "@/lib/login-throttle";
import { hashCode, generateSessionToken, hashSessionToken, normalizeCode } from "@/lib/access-codes";
import {
  getAuthUser,
  SESSION_COOKIE,
  SESSION_DAYS_NORMAL,
  SESSION_DAYS_ADMIN,
} from "@/lib/server-auth";
import { canViewPastoral } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET — 현재 로그인 상태와 내 권한 요약 (화면 구성용. 권한 판단은 서버가 다시 한다)
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ authenticated: false });
  return NextResponse.json({
    authenticated: true,
    displayName: user.displayName,
    title: user.title,
    roleGrade: user.roleGrade,
    isAdmin: user.isAdmin,
    adminVerified: user.adminVerified,
    assignments: user.assignments,
    memberId: user.memberId,
    pastoralAccess: canViewPastoral(user), // 심방 화면 표시 여부 (판단은 서버 공통 규칙)
  });
}

function getClientIp(headerStore: Headers): string {
  return headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

// POST — 접속 코드 로그인
export async function POST(request: Request) {
  const headerStore = await headers();
  const ip = getClientIp(headerStore);

  const rateCheck = await checkLoginAllowed(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: rateCheck.reason ?? "너무 많은 시도입니다." },
      { status: 429 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { code } = (body && typeof body === "object" ? body : {}) as { code?: string };

  if (!code || typeof code !== "string" || code.length > 20 || normalizeCode(code).length !== 6) {
    await recordLoginAttempt(ip, false);
    await delay(1000);
    return NextResponse.json({ error: "접속 코드가 올바르지 않습니다." }, { status: 401 });
  }

  const rows = await db
    .select({
      id: appUsers.id,
      isAdmin: appUsers.isAdmin,
      status: appUsers.status,
    })
    .from(appUsers)
    .where(eq(appUsers.codeHash, hashCode(code)))
    .limit(1);

  const user = rows[0];
  if (!user || user.status !== "active") {
    await recordLoginAttempt(ip, false);
    await delay(1000);
    return NextResponse.json({ error: "접속 코드가 올바르지 않습니다." }, { status: 401 });
  }

  await recordLoginAttempt(ip, true);

  const token = generateSessionToken();
  const days = user.isAdmin ? SESSION_DAYS_ADMIN : SESSION_DAYS_NORMAL;
  const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  await db.insert(sessions).values({
    tokenHash: hashSessionToken(token),
    userId: user.id,
    expiresAt,
  });
  await logAudit(user.id, "auth.login");

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: days * 24 * 60 * 60,
    path: "/",
  });
  // 구 공용 로그인 쿠키는 제거
  response.cookies.set("gwanak-auth", "", { maxAge: 0, path: "/" });
  return response;
}

// DELETE — 로그아웃 (서버 세션 즉시 삭제)
export async function DELETE() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (token) {
    try {
      await db.delete(sessions).where(eq(sessions.tokenHash, hashSessionToken(token)));
    } catch (err) {
      console.error("[auth] 로그아웃 세션 삭제 실패:", err);
    }
  }
  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, "", { maxAge: 0, path: "/" });
  return response;
}
