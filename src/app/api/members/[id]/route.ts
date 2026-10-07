import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { members, memberDepartments } from "@/db/schema";
import { getAuthUser } from "@/lib/server-auth";
import {
  canEditMember,
  canDeleteMember,
  canEditMemberOrgFields,
  getRegistrant,
  memberViewScope,
} from "@/lib/permissions";
import { logAudit } from "@/lib/audit";
import type { Member } from "@/types";

export const dynamic = "force-dynamic";

// 교인 1명 기본정보 수정 — 등록한 사람 본인 또는 관리자.
// 소속(나눔조·부서)·직분·공동의회회원은 관리자만 변경 가능 (비관리자 요청에서는 해당 필드 무시).
// 저장된 행 기준으로 검증하므로 요청 body로 id·대상을 바꿔치기할 수 없다.
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, params);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handleUpdate(request, params);
}

async function handleUpdate(request: Request, params: Promise<{ id: string }>) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });

  const existingRows = await db.select().from(members).where(eq(members.id, id)).limit(1);
  const existing = existingRows[0];
  if (!existing) return NextResponse.json({ error: "대상 없음" }, { status: 404 });

  const registrant = await getRegistrant(id);
  if (!canEditMember(user, registrant)) {
    return NextResponse.json({ error: "수정 권한이 없습니다." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 요청 형식입니다." }, { status: 400 });
  }
  const { member } = (body && typeof body === "object" ? body : {}) as { member?: Partial<Member> };
  if (!member) return NextResponse.json({ error: "데이터가 없습니다." }, { status: 400 });

  const isAdmin = user.isAdmin;
  const canOrg = canEditMemberOrgFields(user); // 소속·직분: 관리자+행정지원
  try {
    await db
      .update(members)
      .set({
        name: typeof member.name === "string" && member.name.trim() ? member.name : existing.name,
        phone: member.phone ?? null,
        address: member.address ?? null,
        detailAddress: member.detailAddress ?? null,
        birthDate: member.birthDate ?? null,
        gender: member.gender ?? null,
        district: member.district ?? null,
        familyMembers: Array.isArray(member.familyMembers)
          ? member.familyMembers
          : existing.familyMembers,
        baptismDate: member.baptismDate ?? null,
        baptismType: member.baptismType ?? null,
        baptismChurch: member.baptismChurch ?? null,
        registrationDate: member.registrationDate ?? null,
        memberJoinDate: member.memberJoinDate ?? null,
        carNumber: member.carNumber ?? null,
        notes: member.notes ?? null,
        photoUrl: member.photoUrl ?? null,
        memberStatus: member.memberStatus ?? existing.memberStatus,
        // ↓ 소속·직분: 관리자+행정지원만. 공동의회회원은 관리자만.
        position: canOrg ? (member.position ?? existing.position) : existing.position,
        nanumjo: canOrg ? (member.nanumjo ?? null) : existing.nanumjo,
        congregationMember: isAdmin
          ? (member.congregationMember ?? existing.congregationMember)
          : existing.congregationMember,
        updatedAt: new Date(),
      })
      .where(eq(members.id, id));

    // 다중 부서 소속 — 관리자+행정지원
    if (canOrg && Array.isArray(member.departments)) {
      await db.delete(memberDepartments).where(eq(memberDepartments.memberId, id));
      if (member.departments.length > 0) {
        await db.insert(memberDepartments).values(
          member.departments.map((d) => ({ memberId: id, departmentName: String(d) })),
        );
      }
    }

    await logAudit(user.id, "member.update", "member", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[PATCH /api/members/[id]]", err);
    return NextResponse.json({ error: "저장 실패" }, { status: 500 });
  }
}

// 삭제는 관리자만 — 작성자 본인도 불가
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  if (!canDeleteMember(user)) {
    return NextResponse.json({ error: "삭제는 관리자만 할 수 있습니다." }, { status: 403 });
  }
  if (memberViewScope(user) !== "full") {
    return NextResponse.json({ error: "권한이 없습니다." }, { status: 403 });
  }

  try {
    await db.delete(members).where(eq(members.id, id));
    await logAudit(user.id, "member.delete", "member", id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[DELETE /api/members/[id]]", err);
    return NextResponse.json({ error: "삭제 실패" }, { status: 500 });
  }
}
