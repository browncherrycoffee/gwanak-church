import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import type { Member } from "@/types";

export const dynamic = "force-dynamic";

// 교인 1명만 원자적으로 업데이트 — 동시 편집 충돌 최소화
// POST도 허용 (모바일 네트워크 호환성)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, params);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, params);
}

async function handleUpdate(
  request: Request,
  params: Promise<{ id: string }>,
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

    const values = {
      id: member.id,
      name: member.name,
      gender: member.gender ?? null,
      birthDate: member.birthDate ?? null,
      phone: member.phone ?? null,
      address: member.address ?? null,
      detailAddress: member.detailAddress ?? null,
      department: member.department ?? null,
      district: member.district ?? null,
      position: member.position ?? null,
      familyHead: member.familyHead ?? null,
      relationship: member.relationship ?? null,
      baptismType: member.baptismType ?? null,
      registrationDate: member.registrationDate ?? null,
      carNumber: member.carNumber ?? null,
      memberStatus: member.memberStatus ?? "활동",
      baptismDate: member.baptismDate ?? null,
      baptismChurch: member.baptismChurch ?? null,
      memberJoinDate: member.memberJoinDate ?? null,
      photoUrl: member.photoUrl ?? null,
      notes: member.notes ?? null,
      familyMembers: member.familyMembers ?? [],
      prayerRequests: member.prayerRequests ?? [],
      pastoralVisits: member.pastoralVisits ?? [],
      createdAt: member.createdAt ? new Date(member.createdAt) : new Date(),
      updatedAt: new Date(),
    };

    // upsert: 없으면 INSERT, 있으면 UPDATE (새 교인 추가도 지원)
    // 동시 편집 충돌 시 1회 재시도
    const doUpsert = () =>
      db
        .insert(members)
        .values(values)
        .onConflictDoUpdate({
          target: members.id,
          set: {
            name: sql`excluded.name`,
            gender: sql`excluded.gender`,
            birthDate: sql`excluded.birth_date`,
            phone: sql`excluded.phone`,
            address: sql`excluded.address`,
            detailAddress: sql`excluded.detail_address`,
            department: sql`excluded.department`,
            district: sql`excluded.district`,
            position: sql`excluded.position`,
            familyHead: sql`excluded.family_head`,
            relationship: sql`excluded.relationship`,
            baptismType: sql`excluded.baptism_type`,
            registrationDate: sql`excluded.registration_date`,
            carNumber: sql`excluded.car_number`,
            memberStatus: sql`excluded.member_status`,
            baptismDate: sql`excluded.baptism_date`,
            baptismChurch: sql`excluded.baptism_church`,
            memberJoinDate: sql`excluded.member_join_date`,
            photoUrl: sql`excluded.photo_url`,
            notes: sql`excluded.notes`,
            familyMembers: sql`excluded.family_members`,
            prayerRequests: sql`excluded.prayer_requests`,
            pastoralVisits: sql`excluded.pastoral_visits`,
            updatedAt: sql`NOW()`,
          },
        });

    try {
      await doUpsert();
    } catch (innerErr) {
      // 동시 쓰기 충돌 시 한 번 재시도
      console.error("[PATCH] upsert 1차 실패, 재시도:", innerErr);
      await doUpsert();
    }

    return NextResponse.json({ ok: true });
  } catch (outerErr) {
    const errMsg = outerErr instanceof Error ? outerErr.message : String(outerErr);
    console.error("[PATCH] upsert 최종 실패:", outerErr);
    return NextResponse.json({ ok: false, error: errMsg.slice(0, 200) }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const cookieStore = await cookies();
  const token = cookieStore.get("gwanak-auth")?.value;
  if (!token || !(await verifyAuthToken(token))) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  try {
    await db.delete(members).where(eq(members.id, id));
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
