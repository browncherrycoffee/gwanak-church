import { NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const [item] = await db
    .select()
    .from(announcements)
    .where(eq(announcements.id, id))
    .limit(1);

  if (!item) {
    return NextResponse.json(
      { error: "공지사항을 찾을 수 없습니다." },
      { status: 404 },
    );
  }

  return NextResponse.json({ data: item });
}
