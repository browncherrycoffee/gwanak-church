import { cookies } from "next/headers";
import { eq, and, gt, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, sessions, userAssignments } from "@/db/schema";
import { hashSessionToken } from "@/lib/access-codes";

export const SESSION_COOKIE = "gwanak-session";
export const SESSION_DAYS_NORMAL = 14;
export const SESSION_DAYS_ADMIN = 7;
export const ADMIN_REVERIFY_MINUTES = 30;

export type RoleGrade = "목사" | "장로" | "집사" | "행정지원" | "없음";

export interface AuthUser {
  id: string;
  memberId: string | null;
  displayName: string;
  title: string | null;
  roleGrade: RoleGrade;
  isAdmin: boolean;
  pastoralScope: "all" | "units" | "own";
  sessionId: string;
  adminVerified: boolean; // 관리자 재확인(코드 재입력)이 유효한가
  assignments: { unitType: "nanumjo" | "department"; unitName: string }[];
}

// 세션 쿠키 → 사용자. 실패하면 null (호출부는 반드시 차단).
// 모든 권한 판단은 이 함수가 DB에서 읽은 값으로만 한다. 클라이언트 값은 믿지 않는다.
export async function getAuthUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const rows = await db
      .select({
        sessionId: sessions.id,
        expiresAt: sessions.expiresAt,
        adminVerifiedUntil: sessions.adminVerifiedUntil,
        userId: appUsers.id,
        memberId: appUsers.memberId,
        displayName: appUsers.displayName,
        title: appUsers.title,
        roleGrade: appUsers.roleGrade,
        isAdmin: appUsers.isAdmin,
        pastoralScope: appUsers.pastoralScope,
        status: appUsers.status,
      })
      .from(sessions)
      .innerJoin(appUsers, eq(sessions.userId, appUsers.id))
      .where(and(eq(sessions.tokenHash, hashSessionToken(token)), gt(sessions.expiresAt, sql`now()`)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;
    // 사용 중지된 사용자는 기존 세션도 즉시 차단
    if (row.status !== "active") return null;

    const assignmentRows = await db
      .select({ unitType: userAssignments.unitType, unitName: userAssignments.unitName })
      .from(userAssignments)
      .where(eq(userAssignments.userId, row.userId));

    return {
      id: row.userId,
      memberId: row.memberId,
      displayName: row.displayName,
      title: row.title,
      roleGrade: (row.roleGrade as RoleGrade) ?? "없음",
      isAdmin: row.isAdmin,
      pastoralScope: (row.pastoralScope as "all" | "units" | "own") ?? "all",
      sessionId: row.sessionId,
      adminVerified:
        !!row.adminVerifiedUntil && new Date(row.adminVerifiedUntil).getTime() > Date.now(),
      assignments: assignmentRows.map((a) => ({
        unitType: a.unitType as "nanumjo" | "department",
        unitName: a.unitName,
      })),
    };
  } catch (err) {
    console.error("[auth] 세션 확인 실패:", err);
    return null; // 확인 실패 시 차단이 기본
  }
}

// 관리자 + 재확인까지 요구 (관리자 화면·관리 API 용)
export async function getVerifiedAdmin(): Promise<AuthUser | null> {
  const user = await getAuthUser();
  if (!user || !user.isAdmin) return null;
  if (!user.adminVerified) return null;
  return user;
}
