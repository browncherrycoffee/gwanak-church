import { NextResponse } from "next/server";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { appUsers, userAssignments, sessions } from "@/db/schema";
import { getVerifiedAdmin } from "@/lib/server-auth";
import { generateAccessCode, hashCode } from "@/lib/access-codes";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const GRADES = ["목사", "장로", "집사", "행정지원", "없음"] as const;

// 6자리 코드는 충돌 가능 — 사용 중인 해시와 겹치지 않는 코드를 뽑는다
async function generateUniqueCode(): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = generateAccessCode();
    const dup = await db
      .select({ id: appUsers.id })
      .from(appUsers)
      .where(eq(appUsers.codeHash, hashCode(code)))
      .limit(1);
    if (!dup[0]) return code;
  }
  throw new Error("코드 생성 실패 — 잠시 후 다시 시도하세요.");
}


// 관리자 전용 — 사용자 목록 (코드·해시는 절대 내려가지 않음)
export async function GET() {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "관리자 확인이 필요합니다." }, { status: 403 });

  const users = await db
    .select({
      id: appUsers.id,
      memberId: appUsers.memberId,
      displayName: appUsers.displayName,
      title: appUsers.title,
      roleGrade: appUsers.roleGrade,
      isAdmin: appUsers.isAdmin,
      pastoralScope: appUsers.pastoralScope,
      status: appUsers.status,
      codeIssuedAt: appUsers.codeIssuedAt,
      createdAt: appUsers.createdAt,
    })
    .from(appUsers)
    .orderBy(sql`${appUsers.createdAt} ASC`);

  const assignments = await db.select().from(userAssignments);
  const byUser = new Map<string, { unitType: string; unitName: string }[]>();
  for (const a of assignments) {
    const list = byUser.get(a.userId);
    const item = { unitType: a.unitType, unitName: a.unitName };
    if (list) list.push(item);
    else byUser.set(a.userId, [item]);
  }

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      hasCode: !!u.codeIssuedAt,
      assignments: byUser.get(u.id) ?? [],
    })),
  });
}

// 사용자 등록 — 코드를 즉시 발급해 1회만 반환
export async function POST(request: Request) {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "관리자 확인이 필요합니다." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { displayName, title, roleGrade, isAdmin, memberId, assignments } = (body && typeof body === "object" ? body : {}) as {
    displayName?: string;
    title?: string;
    roleGrade?: string;
    isAdmin?: boolean;
    memberId?: string;
    assignments?: { unitType: string; unitName: string }[];
  };

  if (!displayName?.trim()) return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
  if (!roleGrade || !GRADES.includes(roleGrade as (typeof GRADES)[number])) {
    return NextResponse.json({ error: "권한 등급이 올바르지 않습니다." }, { status: 400 });
  }

  const code = await generateUniqueCode();
  const inserted = await db
    .insert(appUsers)
    .values({
      displayName: displayName.trim(),
      title: title?.trim() || null,
      roleGrade,
      isAdmin: !!isAdmin,
      memberId: memberId || null,
      codeHash: hashCode(code),
      codeIssuedAt: new Date(),
    })
    .returning({ id: appUsers.id });

  const userId = inserted[0]?.id;
  if (userId && Array.isArray(assignments)) {
    const valid = assignments.filter(
      (a) => (a.unitType === "nanumjo" || a.unitType === "department") && a.unitName?.trim(),
    );
    if (valid.length > 0) {
      await db.insert(userAssignments).values(
        valid.map((a) => ({ userId, unitType: a.unitType, unitName: a.unitName.trim() })),
      );
    }
  }
  await logAudit(admin.id, "user.create", "user", userId, {
    roleGrade,
    isAdmin: !!isAdmin,
    assignmentCount: Array.isArray(assignments) ? assignments.length : 0,
  });

  // 코드는 이 응답에서 한 번만 — DB에는 해시만 저장됨
  return NextResponse.json({ ok: true, id: userId, code });
}

// 사용자 변경 — 등급/직함/관리자/상태/담당/코드 재발급
export async function PATCH(request: Request) {
  const admin = await getVerifiedAdmin();
  if (!admin) return NextResponse.json({ error: "관리자 확인이 필요합니다." }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { userId, action, roleGrade, title, isAdmin, memberId, assignments, pastoralScope } = (body && typeof body === "object" ? body : {}) as {
    userId?: string;
    action?: "update" | "reissue-code" | "disable" | "enable";
    roleGrade?: string;
    title?: string;
    isAdmin?: boolean;
    memberId?: string | null;
    assignments?: { unitType: string; unitName: string }[];
    pastoralScope?: "all" | "units" | "own";
  };
  if (!userId) return NextResponse.json({ error: "대상 사용자가 필요합니다." }, { status: 400 });

  const rows = await db.select().from(appUsers).where(eq(appUsers.id, userId)).limit(1);
  if (!rows[0]) return NextResponse.json({ error: "대상 없음" }, { status: 404 });

  if (action === "reissue-code") {
    const code = await generateUniqueCode();
    await db
      .update(appUsers)
      .set({ codeHash: hashCode(code), codeIssuedAt: new Date(), updatedAt: new Date() })
      .where(eq(appUsers.id, userId));
    // 이전 코드의 모든 세션 즉시 무효화
    await db.delete(sessions).where(eq(sessions.userId, userId));
    await logAudit(admin.id, "user.reissue-code", "user", userId);
    return NextResponse.json({ ok: true, code });
  }

  if (action === "disable" || action === "enable") {
    await db
      .update(appUsers)
      .set({ status: action === "disable" ? "disabled" : "active", updatedAt: new Date() })
      .where(eq(appUsers.id, userId));
    if (action === "disable") {
      await db.delete(sessions).where(eq(sessions.userId, userId)); // 기존 접속 즉시 차단
    }
    await logAudit(admin.id, `user.${action}`, "user", userId);
    return NextResponse.json({ ok: true });
  }

  // 일반 수정
  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (roleGrade && GRADES.includes(roleGrade as (typeof GRADES)[number])) set.roleGrade = roleGrade;
  if (title !== undefined) set.title = title?.trim() || null;
  if (isAdmin !== undefined) set.isAdmin = !!isAdmin;
  if (memberId !== undefined) set.memberId = memberId || null;
  if (pastoralScope === "all" || pastoralScope === "units" || pastoralScope === "own") set.pastoralScope = pastoralScope;
  await db.update(appUsers).set(set).where(eq(appUsers.id, userId));

  if (Array.isArray(assignments)) {
    await db.delete(userAssignments).where(eq(userAssignments.userId, userId));
    const valid = assignments.filter(
      (a) => (a.unitType === "nanumjo" || a.unitType === "department") && a.unitName?.trim(),
    );
    if (valid.length > 0) {
      await db.insert(userAssignments).values(
        valid.map((a) => ({ userId, unitType: a.unitType, unitName: a.unitName.trim() })),
      );
    }
  }

  // 권한 축소가 기존 세션 캐시로 남지 않도록: 등급·담당 변경 시에도 세션은 유지하되
  // 권한은 요청마다 DB에서 읽으므로 즉시 반영된다 (getAuthUser가 매 요청 재조회).
  await logAudit(admin.id, "user.update", "user", userId, {
    roleGrade: (set.roleGrade as string) ?? null,
    isAdmin: isAdmin ?? null,
    assignmentsChanged: Array.isArray(assignments),
  });
  return NextResponse.json({ ok: true });
}
