import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { db } from "@/db";
import { members } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 수동 또는 예약 백업 — 날짜별 스냅샷 저장
// CRON_SECRET 또는 gwanak-auth 쿠키로 인증
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const rows = await db.select().from(members).orderBy(sql`${members.createdAt} DESC`);

    const now = new Date();
    const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
    const dateStr = kst.toISOString().slice(0, 10); // YYYY-MM-DD (KST)
    const timeStr = kst.toISOString().slice(11, 16).replace(":", ""); // HHmm

    const payload = {
      version: 1,
      backupType: "daily-snapshot",
      exportedAt: now.toISOString(),
      date: dateStr,
      count: rows.length,
      members: rows,
    };

    const filename = `gwanak-backup-${dateStr}-${timeStr}.json`;
    const blob = await put(filename, JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.info(`[daily-backup] ${dateStr} 백업 완료: ${rows.length}명 → ${blob.url}`);

    return NextResponse.json({
      ok: true,
      date: dateStr,
      count: rows.length,
      url: blob.url,
      exportedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[daily-backup] 오류:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
