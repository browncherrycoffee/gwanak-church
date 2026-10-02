import { NextResponse } from "next/server";
import { inArray, sql } from "drizzle-orm";
import { db } from "@/db";
import { members, memberDepartments, memberRegistrants } from "@/db/schema";
import { getAuthUser } from "@/lib/server-auth";
import { memberViewScope, canAddMember } from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { Member, MemberNameOnly } from "@/types";

export const dynamic = "force-dynamic";

// 기도제목·심방기록은 이 API로 내려가지 않는다 (별도 권한 API: /api/prayers, /api/pastoral)
function rowToMember(
  row: typeof members.$inferSelect,
  departments: string[],
): Member {
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
    departments,
    district: row.district ?? null,
    nanumjo: row.nanumjo ?? null,
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
    congregationMember: row.congregationMember ?? false,
    prayerRequests: [],
    pastoralVisits: [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

// 직분 없는 조장·부서장용 축소 정보 — 이름·소속·연락처·주소·세례 정보까지만.
// 생년월일·가족·사진·비고 등은 서버가 아예 보내지 않는다.
function rowToNameOnly(row: typeof members.$inferSelect, departments: string[]): MemberNameOnly {
  return {
    id: row.id,
    name: row.name,
    nanumjo: row.nanumjo ?? null,
    departments,
    phone: row.phone ?? null,
    address: row.address ?? null,
    detailAddress: row.detailAddress ?? null,
    baptismType: row.baptismType ?? null,
    baptismDate: row.baptismDate ?? null,
    baptismChurch: row.baptismChurch ?? null,
    memberStatus: row.memberStatus,
    nameOnly: true,
  };
}

async function loadAllDepartments(memberIds: string[]): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>();
  if (memberIds.length === 0) return map;
  const rows = await db
    .select({ memberId: memberDepartments.memberId, dept: memberDepartments.departmentName })
    .from(memberDepartments)
    .where(inArray(memberDepartments.memberId, memberIds));
  for (const r of rows) {
    const list = map.get(r.memberId);
    if (list) list.push(r.dept);
    else map.set(r.memberId, [r.dept]);
  }
  return map;
}

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const scope = memberViewScope(user);
  if (scope === "none") {
    return NextResponse.json({ members: [], count: 0, scope });
  }

  try {
    const rows = await db.select().from(members).orderBy(sql`${members.createdAt} DESC`);
    const deptMap = await loadAllDepartments(rows.map((r) => r.id));

    if (scope === "full") {
      const result = rows.map((r) => rowToMember(r, deptMap.get(r.id) ?? []));
      return NextResponse.json(
        { members: result, count: result.length, scope, exportedAt: new Date().toISOString() },
        { headers: { "Cache-Control": "no-store" } },
      );
    }

    // name-only: 맡은 조·부서 성도만, 이름·소속 필드만
    const myJos = new Set(
      user.assignments.filter((a) => a.unitType === "nanumjo").map((a) => a.unitName),
    );
    const myDepts = new Set(
      user.assignments.filter((a) => a.unitType === "department").map((a) => a.unitName),
    );
    const visible = rows.filter((r) => {
      if (r.nanumjo && myJos.has(r.nanumjo)) return true;
      const depts = deptMap.get(r.id) ?? [];
      return depts.some((d) => myDepts.has(d));
    });
    const result = visible.map((r) => rowToNameOnly(r, deptMap.get(r.id) ?? []));
    return NextResponse.json(
      { members: result, count: result.length, scope },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    console.error("[GET /api/members]", err);
    return NextResponse.json({ error: "DB 연결 실패", members: [], count: 0 }, { status: 500 });
  }
}

// 신규 성도 추가 — 관리자·목사·장로·집사. 등록자를 기록한다.
// (일괄 업서트 PUT은 폐기 — 복원·가져오기는 관리자 전용 /api/admin 경로로 이동)
export async function POST(request: Request) {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canAddMember(user)) {
    return NextResponse.json({ error: "성도 추가 권한이 없습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { member } = (body && typeof body === "object" ? body : {}) as { member?: Partial<Member> };
  if (!member?.name || typeof member.name !== "string") {
    return NextResponse.json({ error: "이름이 필요합니다." }, { status: 400 });
  }

  // 소속·직분은 관리자만 지정 가능 — 비관리자 요청에서는 무시
  const isAdmin = user.isAdmin;
  try {
    const inserted = await db
      .insert(members)
      .values({
        id:
          typeof member.id === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(member.id)
            ? member.id
            : undefined,
        name: member.name,
        phone: member.phone ?? null,
        address: member.address ?? null,
        detailAddress: member.detailAddress ?? null,
        birthDate: member.birthDate ?? null,
        gender: member.gender ?? null,
        position: isAdmin ? (member.position ?? "성도") : "성도",
        department: null, // 단일 부서 필드는 더 이상 쓰지 않음 (member_departments 사용)
        district: member.district ?? null,
        nanumjo: isAdmin ? (member.nanumjo ?? null) : null,
        familyMembers: Array.isArray(member.familyMembers) ? member.familyMembers : [],
        baptismDate: member.baptismDate ?? null,
        baptismType: member.baptismType ?? null,
        baptismChurch: member.baptismChurch ?? null,
        registrationDate: member.registrationDate ?? null,
        memberJoinDate: member.memberJoinDate ?? null,
        carNumber: member.carNumber ?? null,
        notes: member.notes ?? null,
        photoUrl: member.photoUrl ?? null,
        memberStatus: member.memberStatus ?? "활동",
        congregationMember: isAdmin ? (member.congregationMember ?? false) : false,
      })
      .returning({ id: members.id });

    const newId = inserted[0]?.id;
    if (newId) {
      await db.insert(memberRegistrants).values({ memberId: newId, createdByUserId: user.id });
      if (isAdmin && Array.isArray(member.departments) && member.departments.length > 0) {
        await db.insert(memberDepartments).values(
          member.departments.map((d) => ({ memberId: newId, departmentName: String(d) })),
        );
      }
      await logAudit(user.id, "member.create", "member", newId);
    }
    return NextResponse.json({ ok: true, id: newId });
  } catch (err) {
    console.error("[POST /api/members]", err);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}

// PUT — 일괄 업서트. 백업 복원·CSV 가져오기 전용, 시스템 관리자만.
export async function PUT(request: Request) {
  const user = await getAuthUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const list = Array.isArray(body) ? (body as Partial<Member>[]) : [];
  if (list.length === 0) {
    return NextResponse.json({ ok: true, count: 0 });
  }

  try {
    const CHUNK = 250;
    for (let i = 0; i < list.length; i += CHUNK) {
      const chunk = list.slice(i, i + CHUNK).filter((m) => m.id && m.name);
      if (chunk.length === 0) continue;
      const values = chunk.map((m) => ({
        id: m.id as string,
        name: m.name as string,
        phone: m.phone ?? null,
        address: m.address ?? null,
        detailAddress: m.detailAddress ?? null,
        birthDate: m.birthDate ?? null,
        gender: m.gender ?? null,
        position: m.position ?? "성도",
        department: m.department ?? null,
        district: m.district ?? null,
        nanumjo: m.nanumjo ?? null,
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
        congregationMember: m.congregationMember ?? false,
        createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        updatedAt: new Date(),
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
            nanumjo: sql`excluded.nanumjo`,
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
            congregationMember: sql`excluded.congregation_member`,
            // prayer_requests·pastoral_visits(jsonb)는 보존 — 새 테이블이 단일 소스
            updatedAt: sql`excluded.updated_at`,
          },
        });
    }
    await logAudit(user.id, "members.bulk-upsert", "member", undefined, { count: list.length });
    return NextResponse.json({ ok: true, count: list.length, updatedAt: new Date().toISOString() });
  } catch (err) {
    console.error("[PUT /api/members]", err);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}
