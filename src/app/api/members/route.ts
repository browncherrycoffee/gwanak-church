import { NextResponse } from "next/server";
import { put, list } from "@vercel/blob";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN!;
const BLOB_FILENAME = "gwanak-members-backup.json";

export async function GET() {
  try {
    const { blobs } = await list({ token: BLOB_TOKEN, prefix: "gwanak-members-backup" });
    if (blobs.length === 0) return NextResponse.json(null);
    const sorted = blobs.sort(
      (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime(),
    );
    const latest = sorted[0];
    if (!latest) return NextResponse.json(null);
    const res = await fetch(latest.url);
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json(null);
  }
}

export async function PUT(request: Request) {
  try {
    const members = await request.json();
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      count: Array.isArray(members) ? members.length : 0,
      members,
    };
    await put(BLOB_FILENAME, JSON.stringify(payload), {
      access: "public",
      token: BLOB_TOKEN,
      allowOverwrite: true,
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
