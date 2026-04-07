import { NextResponse } from "next/server";
import { list } from "@vercel/blob";

export const dynamic = "force-dynamic";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;
const BLOB_PREFIX = "gwanak-members-backup";

// 전체 데이터 없이 최신 버전 타임스탬프만 반환 — 폴링 비용 최소화
export async function GET() {
  try {
    const { blobs } = await list({ token: BLOB_TOKEN, prefix: BLOB_PREFIX });
    if (blobs.length === 0) return NextResponse.json(null);
    const latest = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    )[0];
    if (!latest) return NextResponse.json(null);
    return NextResponse.json(
      { uploadedAt: latest.uploadedAt.toISOString() },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(null);
  }
}
