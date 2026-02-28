import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { put, head, BlobNotFoundError } from "@vercel/blob";
import { verifyAuthToken } from "@/lib/auth";
import type { Member } from "@/types";

const COOKIE_NAME = "gwanak-auth";
const BLOB_PATHNAME = "gwanak-members-backup.json";

interface BackupPayload {
  version: number;
  exportedAt: string;
  count: number;
  members: Member[];
}

async function getAuthToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value;
}

async function assertAuth(): Promise<boolean> {
  const token = await getAuthToken();
  if (!token) return false;
  return verifyAuthToken(token);
}

// GET /api/backup — 서버 백업에서 교적 데이터 조회
export async function GET() {
  if (!(await assertAuth())) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "백업 스토리지가 설정되지 않았습니다." }, { status: 503 });
  }

  try {
    const blobInfo = await head(BLOB_PATHNAME);
    // Cache-busting: append timestamp to bypass CDN cache after overwrite
    const baseUrl = new URL(blobInfo.url);
    baseUrl.searchParams.set("_t", blobInfo.uploadedAt.getTime().toString());
    const res = await fetch(baseUrl.toString(), { cache: "no-store" });
    if (!res.ok) {
      return NextResponse.json({ error: "백업 파일을 읽을 수 없습니다." }, { status: 500 });
    }

    const payload = (await res.json()) as BackupPayload;
    return NextResponse.json({
      exportedAt: payload.exportedAt,
      count: payload.count,
      members: payload.members,
      uploadedAt: blobInfo.uploadedAt,
    });
  } catch (err) {
    if (err instanceof BlobNotFoundError) {
      return NextResponse.json({ error: "저장된 백업이 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ error: "백업을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

// POST /api/backup — 교적 데이터를 서버에 저장
export async function POST(request: Request) {
  if (!(await assertAuth())) {
    return NextResponse.json({ error: "인증이 필요합니다." }, { status: 401 });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "백업 스토리지가 설정되지 않았습니다." }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }

  const { members } = (body && typeof body === "object" ? body : {}) as { members?: unknown };
  if (!Array.isArray(members)) {
    return NextResponse.json({ error: "교적 데이터가 없습니다." }, { status: 400 });
  }

  const payload: BackupPayload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: members.length,
    members: members as Member[],
  };

  try {
    const blob = await put(BLOB_PATHNAME, JSON.stringify(payload), {
      access: "public",
      contentType: "application/json",
      allowOverwrite: true,
    });

    return NextResponse.json({
      ok: true,
      url: blob.url,
      count: payload.count,
      exportedAt: payload.exportedAt,
    });
  } catch {
    return NextResponse.json({ error: "백업 저장 중 오류가 발생했습니다." }, { status: 500 });
  }
}
