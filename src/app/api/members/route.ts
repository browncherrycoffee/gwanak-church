import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyAuthToken } from "@/lib/auth";
import { db } from "@/db";
import { members } from "@/db/schema";
import { sql } from "drizzle-orm";
import type { Member, PrayerRequest, PastoralVisit } from "@/types";

export const dynamic = "force-dynamic";

function rowToMember(row: typeof members.$inferSelect): Member {
  return {
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    address: row.address ?? null,
    detailAddress: row.detailAddress ?? null,
    birthDate: row.birthDate ?? null,
    gender: row.gender ?? null,
    position: row.position ?? null,
    department: row.department ?? null,
    district: row.district ?? null,
    familyMembers: Array.isArray(row.familyMembers) ? row.familyMembers : [],
    familyHead: row.familyHead ?? null,
    relationship: row.relationship ?? null,
    baptismDate: row.baptismDate ?? null,
    baptismType: row.baptismType ?? null,
    baptismChurch: row.baptismChurch ?? null,
    registrationDate: row.registrationDate ?? null,
    memberJoinDate: row.memberJoinDate ?? null,
    carNumber: row.carNumber ?? null,
    notes: row.notes ?? null,
    photoUrl: row.photoUrl ?? null,
    memberStatus: row.memberStatus,
    prayerRequests: Array.isArray(row.prayerRequests) ? (row.prayerRequests as PrayerRequest[]) : [],
    pastoralVisits: Array.isArray(row.pastoralVisits) ? (row.pastoralVisits as PastoralVisit[]) : [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export async function GET() {
  try {
    const rows = await db.select().from(members).orderBy(sql`${members.createdAt} DESC`);
    const result: Member[] = rows.map(rowToMember);
    return NextResponse.json(
      { members: result, exportedAt: new Date().toISOString(), count: result.length },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/members]", err);
    return NextResponse.json({ members: [], exportedAt: new Date().toISOString(), count: 0 });
  }
}

// bulk upsert — import / restore 용도
export async function PUT(request: Request) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("gwanak-auth")?.value;
    if (!token || !(await verifyAuthToken(token))) {
      return NextResponse.json({ ok: false }, { status: 401 });
    }

    const body = await request.json() as Member[];
    if (!Array.isArray(body) || body.length === 0) {
      return NextResponse.json({ ok: true, count: 0 });
    }

    const CHUNK = 50;
    for (let i = 0; i < body.length; i += CHUNK) {
      const chunk = body.slice(i, i + CHUNK);
      const values = chunk.map((m) => ({
        id: m.id,
        name: m.name,
        phone: m.phone ?? null,
        address: m.address ?? null,
        detailAddress: m.detailAddress ?? null,
        birthDate: m.birthDate ?? null,
        gender: m.gender ?? null,
        position: m.position ?? null,
        department: m.department ?? null,
        district: m.district ?? null,
        familyMembers: Array.isArray(m.familyMembers) ? m.familyMembers : [],
        familyHead: m.familyHead ?? null,
        relationship: m.relationship ?? null,
        baptismDate: m.baptismDate ?? null,
        baptismType: m.baptismType ?? null,
        baptismChurch: m.baptismChurch ?? null,
        registrationDate: m.registrationDate ?? null,
        memberJoinDate: m.memberJoinDate ?? null,
        carNumber: m.carNumber ?? null,
        notes: m.notes ?? null,
        photoUrl: m.photoUrl ?? null,
        memberStatus: m.memberStatus || "활동",
        prayerRequests: Array.isArray(m.prayerRequests) ? m.prayerRequests : [],
        pastoralVisits: Array.isArray(m.pastoralVisits) ? m.pastoralVisits : [],
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
      }));

      await db
        .insert(members)
        .values(values)
        .onConflictDoUpdate({
          target: members.id,
          set: {
            name: sql`excluded.name`,
            phone: sql`excluded.phone`,
            address: sql`excluded.address`,
            detailAddress: sql`excluded.detail_address`,
            birthDate: sql`excluded.birth_date`,
            gender: sql`excluded.gender`,
            position: sql`excluded.position`,
            department: sql`excluded.department`,
            district: sql`excluded.district`,
            familyMembers: sql`excluded.family_members`,
            familyHead: sql`excluded.family_head`,
            relationship: sql`excluded.relationship`,
            baptismDate: sql`excluded.baptism_date`,
            baptismType: sql`excluded.baptism_type`,
            baptismChurch: sql`excluded.baptism_church`,
            registrationDate: sql`excluded.registration_date`,
            memberJoinDate: sql`excluded.member_join_date`,
            carNumber: sql`excluded.car_number`,
            notes: sql`excluded.notes`,
            photoUrl: sql`excluded.photo_url`,
            memberStatus: sql`excluded.member_status`,
            prayerRequests: sql`excluded.prayer_requests`,
            pastoralVisits: sql`excluded.pastoral_visits`,
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }

    return NextResponse.json({ ok: true, count: body.length });
  } catch (err) {
    console.error("[PUT /api/members]", err);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
