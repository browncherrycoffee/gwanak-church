import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put, list, del } from "@vercel/blob";
import { verifyAuthToken } from "@/lib/auth";
import { encryptBackup } from "@/lib/backup-crypto";
import { db } from "@/db";
import { members } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// 수동 또는 예약 백업 — 날짜별 스냅샷 저장
// CRON_SECRET(Vercel Cron) 또는 gwanak-auth 쿠키(수동)로 인증
export async function GET(request: Request) {
  // Vercel Cron 인증
  const authHeader = request.headers.get("authorization");
  const isCron = authHeader === `Bearer ${process.env.CRON_SECRET}`;

  // 관리자 쿠키 인증 (수동 백업용)
  let isCookieAuth = false;
  if (!isCron) {
    const cookieStore = await cookies();
    const token = cookieStore.get("gwanak-auth")?.value;
    isCookieAuth = !!token && await verifyAuthToken(token);
  }

  if (!isCron && !isCookieAuth) {
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
    const blob = await put(filename, encryptBackup(JSON.stringify(payload)), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.info(`[daily-backup] ${dateStr} 백업 완료: ${rows.length}명 → ${blob.url}`);

    // 보존 정책: 30일 지난 일일 스냅샷 삭제 (월말 백업 gwanak-backup-YYYY-MM.json은 영구 보존)
    let prunedCount = 0;
    try {
      const DAILY_RE = /^gwanak-backup-(\d{4}-\d{2}-\d{2})-\d{4}\.json$/;
      const cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .slice(0, 10);
      const { blobs } = await list({ limit: 1000, token: process.env.BLOB_READ_WRITE_TOKEN });
      const stale = blobs.filter((b) => {
        const backupDate = DAILY_RE.exec(b.pathname)?.[1];
        return !!backupDate && backupDate < cutoff;
      });
      if (stale.length > 0) {
        await del(stale.map((b) => b.url), { token: process.env.BLOB_READ_WRITE_TOKEN });
        prunedCount = stale.length;
        console.info(`[daily-backup] 30일 경과 스냅샷 ${prunedCount}개 정리`);
      }
    } catch (pruneErr) {
      // 정리 실패는 백업 성공에 영향 없음
      console.error("[daily-backup] 스냅샷 정리 오류:", pruneErr);
    }

    return NextResponse.json({
      ok: true,
      date: dateStr,
      count: rows.length,
      pruned: prunedCount,
      url: blob.url,
      exportedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[daily-backup] 오류:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
