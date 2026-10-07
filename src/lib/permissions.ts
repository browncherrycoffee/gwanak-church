import { inArray, eq } from "drizzle-orm";
import { db } from "@/db";
import { memberDepartments, members } from "@/db/schema";
import type { AuthUser } from "@/lib/server-auth";

// ─── 권한 공통 규칙 (지시서 3·4·5번 권한표의 단일 구현) ─────────────────────
// 모든 조회·생성·수정·삭제 경로가 이 파일의 함수만 사용한다.
// 판단 재료는 전부 서버가 DB에서 읽은 값이다. 실패·불명 시 차단이 기본.

export interface MemberUnits {
  nanumjo: string | null;
  departments: string[];
}

// 성도들의 소속(나눔조 + 부서 다중)을 한 번에 로드
export async function loadMemberUnits(memberIds: string[]): Promise<Map<string, MemberUnits>> {
  const map = new Map<string, MemberUnits>();
  if (memberIds.length === 0) return map;

  const rows = await db
    .select({ id: members.id, nanumjo: members.nanumjo })
    .from(members)
    .where(inArray(members.id, memberIds));
  for (const r of rows) map.set(r.id, { nanumjo: r.nanumjo ?? null, departments: [] });

  const deptRows = await db
    .select({ memberId: memberDepartments.memberId, dept: memberDepartments.departmentName })
    .from(memberDepartments)
    .where(inArray(memberDepartments.memberId, memberIds));
  for (const r of deptRows) map.get(r.memberId)?.departments.push(r.dept);

  return map;
}

export async function loadOneMemberUnits(memberId: string): Promise<MemberUnits | null> {
  const map = await loadMemberUnits([memberId]);
  return map.get(memberId) ?? null;
}

// 사용자 본인(연결된 성도)의 소속 — 집사 "같은 조·부서" 판단용
export async function loadUserOwnUnits(user: AuthUser): Promise<MemberUnits> {
  if (!user.memberId) return { nanumjo: null, departments: [] };
  return (await loadOneMemberUnits(user.memberId)) ?? { nanumjo: null, departments: [] };
}

// 사용자가 이 성도의 조장/부서장인가 (담당 지정 기준)
export function leadsMember(user: AuthUser, units: MemberUnits): boolean {
  for (const a of user.assignments) {
    if (a.unitType === "nanumjo" && units.nanumjo && a.unitName === units.nanumjo) return true;
    if (a.unitType === "department" && units.departments.includes(a.unitName)) return true;
  }
  return false;
}

// 같은 나눔조 또는 같은 부서에 소속되어 있는가 (집사 열람 조건)
export function sharesUnit(own: MemberUnits, target: MemberUnits): boolean {
  if (own.nanumjo && target.nanumjo && own.nanumjo === target.nanumjo) return true;
  return own.departments.some((d) => target.departments.includes(d));
}

// ─── 성도 기본정보 ──────────────────────────────────────────────────────────
export type MemberViewScope = "full" | "name-only" | "none";

// 관리자·목사·장로·집사·행정지원: 전체. 직분 없는 조장·부서장: 맡은 조·부서 성도의 이름·소속만.
export function memberViewScope(user: AuthUser): MemberViewScope {
  if (user.isAdmin) return "full";
  if (["목사", "장로", "집사", "행정지원"].includes(user.roleGrade)) return "full";
  if (user.assignments.length > 0) return "name-only";
  return "none";
}

export function canAddMember(user: AuthUser): boolean {
  // 행정지원: 담임목사 행정 보좌 역할로 성도 등록·수정 허용 (2026-10-07 사용자 승인)
  return user.isAdmin || ["목사", "장로", "집사", "행정지원"].includes(user.roleGrade);
}

// 기본정보 수정: 등록한 사람 본인 또는 관리자 (작성자 미상 = 관리자만)
// 예외: 행정지원은 데이터 입력 담당이므로 기존 성도도 수정 가능 (2026-10-07 사용자 승인,
//       삭제와 소속·직분·공동의회 변경은 여전히 관리자만 — PATCH 라우트가 필드 단위 강제)
export function canEditMember(user: AuthUser, registrantUserId: string | null): boolean {
  if (user.isAdmin) return true;
  if (user.roleGrade === "행정지원") return true;
  if (!registrantUserId) return false;
  return registrantUserId === user.id && memberViewScope(user) === "full";
}

// 성도 삭제: 관리자만
export function canDeleteMember(user: AuthUser): boolean {
  return user.isAdmin;
}

// 소속(나눔조·부서)·직분·담당 변경: 관리자만 — 수정 API가 필드 단위로 강제
export const ADMIN_ONLY_MEMBER_FIELDS = ["nanumjo", "position", "department"] as const;

// ─── 기도제목 (지시서 4번) ──────────────────────────────────────────────────
export function canViewPrayer(user: AuthUser, target: MemberUnits, own: MemberUnits): boolean {
  if (user.isAdmin) return true;
  if (user.prayerScope === "all") return true; // 감사 기도제목 입력 담당자 — 전체 열람
  if (["목사", "장로", "행정지원"].includes(user.roleGrade)) return true;
  if (leadsMember(user, target)) return true; // 조장·부서장 (직분 무관)
  if (user.roleGrade === "집사" && user.memberId && sharesUnit(own, target)) return true; // 열람만
  return false;
}

// 추가: 그 성도의 조장·부서장, 관리자, 목사. (장로·집사는 맡은 범위에서만 = leadsMember)
export function canAddPrayer(user: AuthUser, target: MemberUnits): boolean {
  if (user.isAdmin) return true;
  if (user.prayerScope === "all") return true; // 감사 기도제목 입력 담당자 — 전체 추가
  if (user.roleGrade === "목사") return true;
  return leadsMember(user, target);
}

// 수정: 작성자 본인(열람 권한 유지 시) 또는 관리자. 작성자 미상은 관리자만.
export function canEditPrayer(
  user: AuthUser,
  authorUserId: string | null,
  target: MemberUnits,
  own: MemberUnits,
): boolean {
  if (user.isAdmin) return true;
  if (!authorUserId || authorUserId !== user.id) return false;
  return canViewPrayer(user, target, own); // 열람 권한이 없어졌으면 수정도 불가
}

// 삭제: 관리자만 (작성자 본인도 불가)
export function canDeletePrayer(user: AuthUser): boolean {
  return user.isAdmin;
}

// ─── 심방기록 (지시서 5번) ──────────────────────────────────────────────────
// 공유 심방기록: 관리자·목사·장로·집사 (행정지원 제외 — 존재 자체를 숨김)
export function canViewPastoral(user: AuthUser): boolean {
  if (user.isAdmin) return true;
  if (["목사", "장로", "집사"].includes(user.roleGrade)) return true;
  // 'own': 등급상 심방 열람이 없어도(예: 행정지원) 본인이 직접 심방하고
  // 작성한 기록은 쓰고 볼 수 있다 (예: 류영협 강도사)
  return user.pastoralScope === "own";
}

export function canAddPastoral(user: AuthUser): boolean {
  return canViewPastoral(user);
}

// 사용자별 심방 범위 한정: pastoralScope가 'units'이면
// 자신이 담당(조장·부서장)한 조·부서 성도의 심방기록만 보고 쓸 수 있다.
// (예: 청년부 담당 사역자는 청년부 성도의 심방기록만)
export function pastoralMemberAllowed(user: AuthUser, target: MemberUnits): boolean {
  if (user.isAdmin) return true;
  if (user.pastoralScope !== "units") return true;
  return leadsMember(user, target);
}

export function canEditPastoral(user: AuthUser, authorUserId: string | null): boolean {
  if (user.isAdmin) return true;
  if (!authorUserId) return false;
  return authorUserId === user.id && canViewPastoral(user);
}

export function canDeletePastoral(user: AuthUser): boolean {
  return user.isAdmin;
}

// 비공개 심방메모: 작성자 본인, 관리자, 담임목사(목사 등급)
export function canViewPastoralNote(user: AuthUser, noteAuthorUserId: string): boolean {
  if (user.isAdmin) return true;
  if (user.roleGrade === "목사") return true;
  return noteAuthorUserId === user.id;
}

export function canEditPastoralNote(user: AuthUser, noteAuthorUserId: string): boolean {
  if (user.isAdmin) return true;
  return noteAuthorUserId === user.id && canViewPastoral(user);
}

export function canDeletePastoralNote(user: AuthUser): boolean {
  return user.isAdmin;
}

// ─── 내보내기·통계·백업 ────────────────────────────────────────────────────
// 내보내기·인쇄는 "자기가 열람 가능한 범위"만 — 데이터 API가 이미 범위 필터하므로 동일 규칙 적용
export function canUseBackupTools(user: AuthUser): boolean {
  return user.isAdmin;
}

// 사용자가 맡았거나 접근 가능한 나눔조/부서 선택지
export function visibleUnits(
  user: AuthUser,
  allJos: string[],
  allDepts: string[],
): { jos: string[]; depts: string[] } {
  if (user.isAdmin || ["목사", "장로", "행정지원"].includes(user.roleGrade)) {
    return { jos: allJos, depts: allDepts };
  }
  const jos = user.assignments.filter((a) => a.unitType === "nanumjo").map((a) => a.unitName);
  const depts = user.assignments.filter((a) => a.unitType === "department").map((a) => a.unitName);
  return { jos, depts };
}

// 성도 상세에서 등록자 조회
export async function getRegistrant(memberId: string): Promise<string | null> {
  const { memberRegistrants } = await import("@/db/schema");
  const rows = await db
    .select({ uid: memberRegistrants.createdByUserId })
    .from(memberRegistrants)
    .where(eq(memberRegistrants.memberId, memberId))
    .limit(1);
  return rows[0]?.uid ?? null;
}
