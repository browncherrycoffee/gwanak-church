import { NextResponse } from "next/server";
import { eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { pastoralRecords, pastoralNotes, appUsers, members } from "@/db/schema";
import { getAuthUser } from "@/lib/server-auth";
import { canViewPastoral, canAddPastoral, canViewPastoralNote, pastoralMemberAllowed, loadMemberUnits } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// GET /api/pastoral — 심방기록 목록.
// 행정지원·권한 없는 등급에게는 404가 아닌 403: 단, 응답에 어떤 심방 정보(건수 포함)도 싣지 않는다.
// 비공개 메모만 있는 기록(sharedContent 없음)은 메모 열람권자에게만 내려간다 — 다른 사람에게는
// 목록·건수에도 나타나지 않는다.
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canViewPastoral(user)) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    const allRecords = await db
      .select()
      .from(pastoralRecords)
      .orderBy(sql`${pastoralRecords.createdAt} DESC`);

    // 사용자별 심방 범위 한정
    let records = allRecords;
    if (!user.isAdmin && user.pastoralScope === "own") {
      // 본인이 작성한 기록만 (예: 행정지원 등급의 심방 사역자)
      records = allRecords.filter((r) => r.authorUserId === user.id);
    } else if (!user.isAdmin && user.pastoralScope === "units") {
      const unitMap = await loadMemberUnits([...new Set(allRecords.map((r) => r.memberId))]);
      records = allRecords.filter((r) => {
        const u = unitMap.get(r.memberId);
        return !!u && pastoralMemberAllowed(user, u);
      });
    }

    const recordIds = records.map((r) => r.id);
    const notes = recordIds.length
      ? await db.select().from(pastoralNotes).where(inArray(pastoralNotes.recordId, recordIds))
      : [];

    // 이 사용자가 볼 수 있는 메모만 (작성자 본인·담임목사·관리자)
    const visibleNotes = notes.filter((n) => canViewPastoralNote(user, n.authorUserId));
    const visibleNotesByRecord = new Map<string, typeof visibleNotes>();
    for (const n of visibleNotes) {
      const list = visibleNotesByRecord.get(n.recordId);
      if (list) list.push(n);
      else visibleNotesByRecord.set(n.recordId, [n]);
    }

    // 공유 내용이 없는(메모만 있는) 기록은 메모를 볼 수 있는 사람에게만 노출
    const visibleRecords = records.filter(
      (r) => (r.sharedContent && r.sharedContent.trim()) || visibleNotesByRecord.has(r.id),
    );

    const userIds = [
      ...new Set([
        ...visibleRecords.flatMap((r) => [r.authorUserId, r.lastEditorUserId]),
        ...visibleNotes.map((n) => n.authorUserId),
      ].filter(Boolean)),
    ] as string[];
    const nameRows = userIds.length
      ? await db.select({ id: appUsers.id, name: appUsers.displayName }).from(appUsers).where(inArray(appUsers.id, userIds))
      : [];
    const nameMap = new Map(nameRows.map((r) => [r.id, r.name]));

    return NextResponse.json(
      {
        records: visibleRecords.map((r) => ({
          id: r.id,
          memberId: r.memberId,
          visitedAt: r.visitedAt,
          sharedContent: r.sharedContent,
          authorName: r.authorUserId ? (nameMap.get(r.authorUserId) ?? "알 수 없음") : "작성자 미상",
          authorUserId: r.authorUserId,
          createdAt: r.createdAt.toISOString(),
          updatedAt: r.updatedAt.toISOString(),
          canEdit: user.isAdmin || (!!r.authorUserId && r.authorUserId === user.id),
          canDelete: user.isAdmin,
          // 비공개 메모 — 권한 있는 것만. 없으면 빈 배열(존재 여부도 전달 안 함).
          privateNotes: (visibleNotesByRecord.get(r.id) ?? []).map((n) => ({
            id: n.id,
            content: n.content,
            authorName: nameMap.get(n.authorUserId) ?? "알 수 없음",
            authorUserId: n.authorUserId,
            createdAt: n.createdAt.toISOString(),
            canEdit: user.isAdmin || n.authorUserId === user.id,
            canDelete: user.isAdmin,
          })),
        })),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/pastoral]", err);
    return NextResponse.json({ error: "조회 실패" }, { status: 500 });
  }
}

// POST /api/pastoral — 심방기록 작성 (공유 내용 + 선택적 비공개 메모)
// 공유 내용 없이 비공개 메모만 쓰는 것도 허용.
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canAddPastoral(user)) {
    return NextResponse.json({ error: "심방기록 작성 권한이 없습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { memberId, visitedAt, sharedContent, privateNote } = (body && typeof body === "object" ? body : {}) as {
    memberId?: string;
    visitedAt?: string;
    sharedContent?: string;
    privateNote?: string;
  };

  if (!memberId) return NextResponse.json({ error: "대상 성도가 필요합니다." }, { status: 400 });
  if (!sharedContent?.trim() && !privateNote?.trim()) {
    return NextResponse.json({ error: "공유 내용 또는 비공개 메모가 필요합니다." }, { status: 400 });
  }

  const exists = await db.select({ id: members.id }).from(members).where(eq(members.id, memberId)).limit(1);
  if (!exists[0]) return NextResponse.json({ error: "대상 성도가 없습니다." }, { status: 404 });

  // 심방 범위 한정 사용자: 담당 조·부서 성도에게만 작성 가능
  if (!user.isAdmin && user.pastoralScope === "units") {
    const unitMap = await loadMemberUnits([memberId]);
    const u = unitMap.get(memberId);
    if (!u || !pastoralMemberAllowed(user, u)) {
      return NextResponse.json({ error: "담당 범위 밖 성도의 심방기록은 작성할 수 없습니다." }, { status: 403 });
    }
  }

  try {
    const inserted = await db
      .insert(pastoralRecords)
      .values({
        memberId,
        visitedAt: visitedAt ?? null,
        sharedContent: sharedContent?.trim() || null,
        authorUserId: user.id, // 서버가 세션으로 결정 — 클라이언트 값 무시
      })
      .returning({ id: pastoralRecords.id });

    const recordId = inserted[0]?.id;
    if (recordId && privateNote?.trim()) {
      await db.insert(pastoralNotes).values({
        recordId,
        authorUserId: user.id,
        content: privateNote.trim(),
      });
    }
    await logAudit(user.id, "pastoral.create", "pastoral", recordId, {
      hasPrivateNote: !!privateNote?.trim(),
    });
    return NextResponse.json({ ok: true, id: recordId });
  } catch (err) {
    console.error("[POST /api/pastoral]", err);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
