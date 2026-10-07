import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { prayers, appUsers, members } from "@/db/schema";
import { getAuthUser } from "@/lib/server-auth";
import {
  loadMemberUnits,
  loadUserOwnUnits,
  canViewPrayer,
  canAddPrayer,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/prayers — 내 권한 범위의 기도제목 전체.
// 성도 기준 단일 기록이므로 조·부서 보기에서 같은 기록이 중복 복제되지 않는다.
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const all = await db
      .select({
        id: prayers.id,
        memberId: prayers.memberId,
        content: prayers.content,
        authorUserId: prayers.authorUserId,
        lastEditorUserId: prayers.lastEditorUserId,
        createdAt: prayers.createdAt,
        updatedAt: prayers.updatedAt,
      })
      .from(prayers)
      .orderBy(sql`${prayers.createdAt} DESC`);

    const memberIds = [...new Set(all.map((p) => p.memberId))];
    const units = await loadMemberUnits(memberIds);
    const own = await loadUserOwnUnits(user);

    const visible = all.filter((p) => {
      const u = units.get(p.memberId);
      if (!u) return false; // 소속 확인 불가 → 차단 기본 (관리자·목사·장로·행정지원은 통과)
      return canViewPrayer(user, u, own);
    });

    // 작성자 표시 이름 (코드·민감정보 아님)
    const userIds = [
      ...new Set(visible.flatMap((p) => [p.authorUserId, p.lastEditorUserId]).filter(Boolean)),
    ] as string[];
    const nameRows = userIds.length
      ? await db
          .select({ id: appUsers.id, name: appUsers.displayName })
          .from(appUsers)
          .where(inArray(appUsers.id, userIds))
      : [];
    const nameMap = new Map(nameRows.map((r) => [r.id, r.name]));

    return NextResponse.json(
      {
        prayers: visible.map((p) => ({
          id: p.id,
          memberId: p.memberId,
          content: p.content,
          authorName: p.authorUserId ? (nameMap.get(p.authorUserId) ?? "알 수 없음") : "작성자 미상",
          authorUserId: p.authorUserId,
          lastEditorName: p.lastEditorUserId ? (nameMap.get(p.lastEditorUserId) ?? null) : null,
          createdAt: p.createdAt.toISOString(),
          updatedAt: p.updatedAt.toISOString(),
          canEdit:
            user.isAdmin ||
            user.roleGrade === "목사" ||
            user.roleGrade === "행정지원" ||
            (!!p.authorUserId && p.authorUserId === user.id),
          canDelete: user.isAdmin,
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/prayers]", err);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

// POST /api/prayers — 추가. 대상 성도 범위를 서버에서 다시 검증.
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { memberId, content } = (body && typeof body === "object" ? body : {}) as {
    memberId?: string;
    content?: string;
  };
  if (!memberId || !content?.trim()) {
    return NextResponse.json({ error: "대상 성도와 내용이 필요합니다." }, { status: 400 });
  }

  const exists = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId)).limit(1);
  if (!exists[0]) return NextResponse.json({ error: "대상 성도가 없습니다." }, { status: 404 });

  const units = await loadMemberUnits([memberId]);
  const u = units.get(memberId);
  if (!u || !canAddPrayer(user, u)) {
    return NextResponse.json({ error: "이 성도에게 기도제목을 추가할 권한이 없습니다." }, { status: 403 });
  }

  try {
    const inserted = await db
      .insert(prayers)
      .values({ memberId, content: content.trim(), authorUserId: user.id }) // 작성자는 서버가 세션으로 결정
      .returning({ id: prayers.id });
    await logAudit(user.id, "prayer.create", "prayer", inserted[0]?.id);
    return NextResponse.json({ ok: true, id: inserted[0]?.id });
  } catch (err) {
    console.error("[POST /api/prayers]", err);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
