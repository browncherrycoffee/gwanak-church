import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, sessions } from "@/db/schema";
import { checkRateLimit, recordFailedAttempt, resetAttempts } from "@/lib/rate-limit";
import { hashCode } from "@/lib/access-codes";
import { getAuthUser, ADMIN_REVERIFY_MINUTES } from "@/lib/server-auth";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 관리자 추가 보호: 관리자 화면 진입 시 본인 접속 코드를 다시 입력해야 한다.
// 성공하면 이 세션에 한해 30분간 관리 기능이 열린다.
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const headerStore = await headers();
  const ip = headerStore.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const rateCheck = checkRateLimit(ip);
  if (!rateCheck.allowed) {
    return NextResponse.json(
      { error: `너무 많은 시도입니다. ${rateCheck.retryAfterSeconds}초 후 다시 시도하세요.` },
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

  if (!code || typeof code !== "string") {
    recordFailedAttempt(ip);
    return NextResponse.json({ error: "코드를 입력하세요." }, { status: 401 });
  }

  const rows = await db
    .select({ codeHash: appUsers.codeHash })
    .from(appUsers)
    .where(eq(appUsers.id, user.id))
    .limit(1);

  if (!rows[0]?.codeHash || rows[0].codeHash !== hashCode(code)) {
    recordFailedAttempt(ip);
    await new Promise((r) => setTimeout(r, 1000));
    return NextResponse.json({ error: "코드가 일치하지 않습니다." }, { status: 401 });
  }

  resetAttempts(ip);
  const until = new Date(Date.now() + ADMIN_REVERIFY_MINUTES * 60 * 1000);
  await db.update(sessions).set({ adminVerifiedUntil: until }).where(eq(sessions.id, user.sessionId));
  await logAudit(user.id, "auth.admin-verify");

  return NextResponse.json({ ok: true, verifiedUntil: until.toISOString() });
}
