import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { prayers } from "@/db/schema";
import { getAuthUser } from "@/lib/server-auth";
import {
  loadMemberUnits,
  loadUserOwnUnits,
  canEditPrayer,
  canDeletePrayer,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";

export const dynamic = "force-dynamic";

// 수정 — 작성자 본인(열람 권한 유지 시) 또는 관리자.
// 저장된 기록의 대상 성도를 기준으로 검증한다. 요청으로 memberId·작성자를 바꿀 수 없다.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const rows = await db.select().from(prayers).where(eq(prayers.id, id)).limit(1);
  const prayer = rows[0];
  if (!prayer) return NextResponse.json({ error: "대상 없음" }, { status: 404 });

  const units = await loadMemberUnits([prayer.memberId]);
  const own = await loadUserOwnUnits(user);
  const u = units.get(prayer.memberId);
  if (!u || !canEditPrayer(user, prayer.authorUserId, u, own)) {
    return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { content } = (body && typeof body === "object" ? body : {}) as { content?: string };
  if (!content?.trim()) return NextResponse.json({ error: "내용이 필요합니다." }, { status: 400 });

  await db
    .update(prayers)
    .set({ content: content.trim(), lastEditorUserId: user.id, updatedAt: new Date() })
    .where(eq(prayers.id, id));
  await logAudit(user.id, "prayer.update", "prayer", id);
  return NextResponse.json({ ok: true });
}

// 삭제 — 관리자만. 작성자 본인의 삭제 요청도 거부한다.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canDeletePrayer(user)) {
    return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
  }

  await db.delete(prayers).where(eq(prayers.id, id));
  await logAudit(user.id, "prayer.delete", "prayer", id);
  return NextResponse.json({ ok: true });
}
