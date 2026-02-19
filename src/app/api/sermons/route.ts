import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { sermons } from "@/db/schema";
import { desc, eq, and, ilike, or } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const category = searchParams.get("category");
  const search = searchParams.get("search");
  const page = Number(searchParams.get("page") ?? "1");
  const limit = Number(searchParams.get("limit") ?? "12");
  const offset = (page - 1) * limit;

  const conditions = [eq(sermons.isPublished, true)];

  if (category) {
    conditions.push(eq(sermons.category, category));
  }

  if (search) {
    conditions.push(
      or(
        ilike(sermons.title, `%${search}%`),
        ilike(sermons.preacher, `%${search}%`),
        ilike(sermons.scripture, `%${search}%`),
      )!,
    );
  }

  const items = await db
    .select()
    .from(sermons)
    .where(and(...conditions))
    .orderBy(desc(sermons.sermonDate))
    .limit(limit)
    .offset(offset);

  return NextResponse.json({ data: items, page, limit });
}
