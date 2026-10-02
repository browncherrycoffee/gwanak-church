import { NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { encryptBackup } from "@/lib/backup-crypto";
import { db } from "@/db";
import { members, appUsers, userAssignments, memberDepartments, prayers, pastoralRecords, pastoralNotes, memberRegistrants } from "@/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Vercel Cron이 호출하는 월말 자동 백업
// vercel.json에 cron 스케줄 설정 필요
export async function GET(request: Request) {
  // Vercel Cron Secret 인증
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // 말일 체크 (28~31일만 실행, 다음날이 1일인 경우)
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const isLastDay = tomorrow.getDate() === 1;

  if (!isLastDay) {
    return NextResponse.json({
      skipped: true,
      message: `오늘(${now.getDate()}일)은 말일이 아닙니다.`,
    });
  }

  try {
    const rows = await db.select().from(members).orderBy(sql`${members.createdAt} DESC`);
    // 접근 권한 체계 테이블도 백업에 포함 (v2) — 코드 해시는 복원에 필요하므로 포함되지만
    // 백업 전체가 AES-256-GCM 암호화되므로 평문 노출 없음
    const accessData = {
      appUsers: await db.select().from(appUsers),
      userAssignments: await db.select().from(userAssignments),
      memberDepartments: await db.select().from(memberDepartments),
      prayers: await db.select().from(prayers),
      pastoralRecords: await db.select().from(pastoralRecords),
      pastoralNotes: await db.select().from(pastoralNotes),
      memberRegistrants: await db.select().from(memberRegistrants),
    };

    const yearMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const payload = {
      version: 2,
      backupType: "monthly-auto",
      exportedAt: now.toISOString(),
      yearMonth,
      count: rows.length,
      members: rows,
      access: accessData,
    };

    const blob = await put(
      `gwanak-backup-${yearMonth}.json`,
      encryptBackup(JSON.stringify(payload)),
      {
        access: "public",
        contentType: "application/json",
        allowOverwrite: true,
        token: process.env.BLOB_READ_WRITE_TOKEN,
      },
    );

    console.info(`[monthly-backup] ${yearMonth} 백업 완료: ${rows.length}명 → ${blob.url}`);

    return NextResponse.json({
      ok: true,
      yearMonth,
      count: rows.length,
      url: blob.url,
      exportedAt: now.toISOString(),
    });
  } catch (err) {
    console.error("[monthly-backup] 오류:", err);
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 });
  }
}
