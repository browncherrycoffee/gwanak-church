import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put, list, del } from "@vercel/blob";
import { verifyAuthToken } from "@/lib/auth";

// 캐시 없이 매번 새 데이터 반환
export const dynamic = "force-dynamic";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;
const BLOB_PREFIX = "gwanak-members-backup";

export async function GET() {
  try {
    const { blobs } = await list({ token: BLOB_TOKEN, prefix: BLOB_PREFIX });
    if (blobs.length === 0) return NextResponse.json(null);
    const sorted = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    const latest = sorted[0];
    if (!latest) return NextResponse.json(null);
    // cache: 'no-store' — CDN 캐시 무시하고 최신 blob 직접 조회
    const res = await fetch(latest.url, { cache: "no-store" });
    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gwanak-auth")?.value;
    if (!token || !(await verifyAuthToken(token))) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }
    const members = await request.json();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: Array.isArray(members) ? members.length : 0,
      members,
    };
    // addRandomSuffix 기본값(true) — 저장마다 고유 URL 생성, CDN 캐시 문제 방지
    await put(BLOB_PREFIX, JSON.stringify(payload), {
      access: "public",
      token: BLOB_TOKEN,
      contentType: "application/json",
    });

    // 오래된 버전 정리 — 최신 3개만 유지
    try {
      const { blobs } = await list({ token: BLOB_TOKEN, prefix: BLOB_PREFIX });
      if (blobs.length > 3) {
        const old = blobs
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(3);
        await Promise.all(old.map((b) => del(b.url, { token: BLOB_TOKEN })));
      }
    } catch {
      // 정리 실패는 무시 (저장 자체는 성공)
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
