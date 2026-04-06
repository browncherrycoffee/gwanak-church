import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put, list, del } from "@vercel/blob";
import { verifyAuthToken } from "@/lib/auth";
import type { Member } from "@/types";

export const dynamic = "force-dynamic";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;
const BLOB_PREFIX = "gwanak-members-backup";

// 교인 1명만 원자적으로 업데이트 — 동시 편집 충돌 최소화
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("gwanak-auth")?.value;
  if (!token || !(await verifyAuthToken(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const { member } = (await request.json()) as { member: Member };
    if (!member || member.id !== id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    // 최신 blob 읽기
    const { blobs } = await list({ token: BLOB_TOKEN, prefix: BLOB_PREFIX });
    if (blobs.length === 0) {
      return NextResponse.json({ ok: false, error: "no data" }, { status: 404 });
    }

    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0]!;

    const res = await fetch(latest.url, { cache: "no-store" });
    const data = (await res.json()) as {
      version: number;
      exportedAt: string;
      members: Member[];
    };

    if (!Array.isArray(data?.members)) {
      return NextResponse.json({ ok: false }, { status: 500 });
    }

    // 해당 교인만 교체 (나머지는 그대로)
    const idx = data.members.findIndex((m) => m.id === id);
    if (idx === -1) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }
    data.members[idx] = member;

    const payload = {
      version: data.version ?? 1,
      exportedAt: new Date().toISOString(),
      count: data.members.length,
      members: data.members,
    };

    await put(BLOB_PREFIX, JSON.stringify(payload), {
      access: "public",
      token: BLOB_TOKEN,
      contentType: "application/json",
    });

    // 오래된 blob 정리 (최신 3개 유지)
    try {
      const { blobs: all } = await list({ token: BLOB_TOKEN, prefix: BLOB_PREFIX });
      if (all.length > 3) {
        const old = all
          .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
          .slice(3);
        await Promise.all(old.map((b) => del(b.url, { token: BLOB_TOKEN })));
      }
    } catch {
      // 정리 실패는 무시
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
