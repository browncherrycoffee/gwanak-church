import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { announcements } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const offset = (page - 1) * limit;

  const conditions = [eq(announcements.isPublished, true)];
  if (category) {
    conditions.push(eq(announcements.category, category));
  }

  const items = await db
    .select()
    .from(announcements)
    .where(and(...conditions))
    .orderBy(desc(announcements.isPinned), desc(announcements.publishedAt))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data: items, page, limit });
}
