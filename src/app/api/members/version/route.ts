import { NextResponse } from "next/server";
import { db } from "@/db";
import { members } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// 전체 데이터 없이 최신 updated_at 타임스탬프만 반환 — 폴링 비용 최소화
export async function GET() {
  try {
    const result = await db
      .select({ latest: sql<string>`MAX(${members.updatedAt})` })
      .from(members);

    const latest = result[0]?.latest;
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
