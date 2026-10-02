import { NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { db } from "@/db";
import { getAuthUser } from "@/lib/server-auth";

export const dynamic = "force-dynamic";

// 폴링용 버전 — 교인·기도제목·심방기록 중 가장 최근 변경 시각만 반환 (데이터 없음)
export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  try {
    const result = await db.execute(sql`
      SELECT GREATEST(
        (SELECT MAX(updated_at) FROM members),
        (SELECT MAX(updated_at) FROM prayers),
        (SELECT MAX(updated_at) FROM pastoral_records),
        (SELECT MAX(updated_at) FROM pastoral_notes)
      ) AS latest
    `);
    const latest = (result as unknown as { latest: string | Date | null }[])[0]?.latest;
    if (!latest) return NextResponse.json(null);
    return NextResponse.json(
      { updatedAt: new Date(latest).toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/members/version]", err);
    return NextResponse.json(null);
  }
}
