import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { pastoralRecords, pastoralNotes } from "@/db/schema";
import { getAuthUser } from "@/lib/server-auth";
import {
  canViewPastoral,
  canEditPastoral,
  canDeletePastoral,
  canEditPastoralNote,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 공유 심방기록 수정 — 작성자 본인 또는 관리자.
// 다른 사람의 비공개 메모는 이 경로로 절대 수정되지 않는다 (메모는 /api/pastoral/[id]/note).
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canViewPastoral(user)) return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });

  const rows = await db.select().from(pastoralRecords).where(eq(pastoralRecords.id, id)).limit(1);
  const record = rows[0];
  if (!record) return NextResponse.json({ error: "대상 없음" }, { status: 404 });

  if (!canEditPastoral(user, record.authorUserId)) {
    return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { sharedContent, visitedAt } = (body && typeof body === "object" ? body : {}) as {
    sharedContent?: string;
    visitedAt?: string;
  };

  await db
    .update(pastoralRecords)
    .set({
      sharedContent: sharedContent?.trim() || null,
      visitedAt: visitedAt ?? record.visitedAt,
      lastEditorUserId: user.id, // 공유 기록을 다른 사람이 수정해도 메모 작성자는 불변
      updatedAt: new Date(),
    })
    .where(eq(pastoralRecords.id, id));
  await logAudit(user.id, "pastoral.update", "pastoral", id);
  return NextResponse.json({ ok: true });
}

// 삭제 — 관리자만. 비공개 메모가 딸려 있으면 개수를 알려 확인을 돕는다 (?confirm=1로 확정).
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canDeletePastoral(user)) {
    return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
  }

  const noteRows = await db
    .select({ id: pastoralNotes.id })
    .from(pastoralNotes)
    .where(eq(pastoralNotes.recordId, id));

  const confirmed = new URL(request.url).searchParams.get("confirm") === "1";
  if (noteRows.length > 0 && !confirmed) {
    return NextResponse.json(
      {
        needsConfirm: true,
        noteCount: noteRows.length,
        message: `비공개 메모 ${noteRows.length}건이 함께 삭제됩니다.`,
      },
      { status: 409 },
    );
  }

  await db.delete(pastoralRecords).where(eq(pastoralRecords.id, id)); // 메모는 FK cascade로 함께 삭제
  await logAudit(user.id, "pastoral.delete", "pastoral", id, { deletedNotes: noteRows.length });
  return NextResponse.json({ ok: true });
}

// 비공개 메모 추가/수정 — PUT /api/pastoral/[id] { noteId?, content }
// 추가는 그 심방기록의 작성자만, 수정은 메모 작성자 본인·관리자만.
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canViewPastoral(user) && !user.isAdmin) {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  const rows = await db.select().from(pastoralRecords).where(eq(pastoralRecords.id, id)).limit(1);
  const record = rows[0];
  if (!record) return NextResponse.json({ error: "대상 없음" }, { status: 404 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { noteId, content } = (body && typeof body === "object" ? body : {}) as {
    noteId?: string;
    content?: string;
  };
  if (!content?.trim()) return NextResponse.json({ error: "내용이 필요합니다." }, { status: 400 });

  if (noteId) {
    // 기존 메모 수정
    const noteRows = await db.select().from(pastoralNotes).where(eq(pastoralNotes.id, noteId)).limit(1);
    const note = noteRows[0];
    if (!note || note.recordId !== id) return NextResponse.json({ error: "대상 없음" }, { status: 404 });
    if (!canEditPastoralNote(user, note.authorUserId)) {
      return NextResponse.json({ error: "메모 수정 권한이 없습니다." }, { status: 403 });
    }
    await db
      .update(pastoralNotes)
      .set({ content: content.trim(), updatedAt: new Date() })
      .where(eq(pastoralNotes.id, noteId));
    await logAudit(user.id, "pastoral-note.update", "pastoral-note", noteId);
    return NextResponse.json({ ok: true });
  }

  // 새 메모 추가 — 심방기록 작성자만 (지시서 3번 표: 비공개 메모 추가 = 심방기록 작성자)
  if (!user.isAdmin && record.authorUserId !== user.id) {
    return NextResponse.json({ error: "이 기록에 메모를 추가할 권한이 없습니다." }, { status: 403 });
  }
  const inserted = await db
    .insert(pastoralNotes)
    .values({ recordId: id, authorUserId: user.id, content: content.trim() })
    .returning({ id: pastoralNotes.id });
  await logAudit(user.id, "pastoral-note.create", "pastoral-note", inserted[0]?.id);
  return NextResponse.json({ ok: true, id: inserted[0]?.id });
}
