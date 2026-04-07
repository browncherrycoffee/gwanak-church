import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import type { Member } from "@/types";

export const dynamic = "force-dynamic";

async function requireAuth(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get("gwanak-auth")?.value;
  if (!token) return false;
  return verifyAuthToken(token);
}

// 교인 1명 원자적 업데이트
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const { member } = (await request.json()) as { member: Member };
    if (!member || member.id !== id) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const result = await db
      .update(members)
      .set({
        name: member.name,
        phone: member.phone ?? null,
        address: member.address ?? null,
        detailAddress: member.detailAddress ?? null,
        birthDate: member.birthDate ?? null,
        gender: member.gender ?? null,
        position: member.position ?? null,
        department: member.department ?? null,
        district: member.district ?? null,
        familyMembers: Array.isArray(member.familyMembers) ? member.familyMembers : [],
        familyHead: member.familyHead ?? null,
        relationship: member.relationship ?? null,
        baptismDate: member.baptismDate ?? null,
        baptismType: member.baptismType ?? null,
        baptismChurch: member.baptismChurch ?? null,
        registrationDate: member.registrationDate ?? null,
        memberJoinDate: member.memberJoinDate ?? null,
        carNumber: member.carNumber ?? null,
        notes: member.notes ?? null,
        photoUrl: member.photoUrl ?? null,
        memberStatus: member.memberStatus || "활동",
        prayerRequests: Array.isArray(member.prayerRequests) ? member.prayerRequests : [],
        pastoralVisits: Array.isArray(member.pastoralVisits) ? member.pastoralVisits : [],
        updatedAt: sql`NOW()`,
      })
      .where(eq(members.id, id))
      .returning({ id: members.id });

    if (result.length === 0) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/members/[id]]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}

// 교인 삭제
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  if (!(await requireAuth())) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    const result = await db
      .delete(members)
      .where(eq(members.id, id))
      .returning({ id: members.id });

    if (result.length === 0) {
      return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/members/[id]]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
