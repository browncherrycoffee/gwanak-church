import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getAuthUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

// 폴링용 버전 — 교인·기도제목·심방기록·비공개메모의 최근 변경 시각 + 행 수.
// 행 수를 포함해야 "삭제"도 변경으로 감지된다 (삭제는 MAX(updated_at)를 바꾸지 않음).
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const result = await db.execute(sql`
      SELECT
        GREATEST(
          (SELECT MAX(updated_at) FROM members),
          (SELECT MAX(updated_at) FROM prayers),
          (SELECT MAX(updated_at) FROM pastoral_records),
          (SELECT MAX(updated_at) FROM pastoral_notes)
        ) AS latest,
        (SELECT COUNT(*) FROM members) AS mc,
        (SELECT COUNT(*) FROM prayers) AS pc,
        (SELECT COUNT(*) FROM pastoral_records) AS rc,
        (SELECT COUNT(*) FROM pastoral_notes) AS nc
    `);
    const row = (result as unknown as {
      latest: string | Date | null; mc: string; pc: string; rc: string; nc: string;
    }[])[0];
    if (!row?.latest) return NextResponse.json(null);

    const updatedAt = new Date(row.latest).toISOString();
    return NextResponse.json(
      {
        updatedAt, // 구버전 클라이언트 호환
        version: `${updatedAt}|${row.mc}|${row.pc}|${row.rc}|${row.nc}`,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/members/version]", err);
    return NextResponse.json(null);
  }
}
