// 교인 DB row → API Member 직렬화 (목록 API·개별 수정 API 공용).
// 저장 후 서버가 실제 저장값을 그대로 돌려줄 때도 이 매퍼를 써서
// "폼이 보낸 값"과 "서버가 저장한 값"이 어긋나는 split-brain을 원천 차단한다.
import type { members } from "@/db/schema";
import type { Member } from "@/types";

export function rowToMember(
  row: typeof members.$inferSelect,
  departments: string[],
  canEdit: boolean,
): Member {
  return {
    canEdit,
    id: row.id,
    name: row.name,
    phone: row.phone ?? null,
    address: row.address ?? null,
    detailAddress: row.detailAddress ?? null,
    birthDate: row.birthDate ?? null,
    gender: row.gender ?? null,
    position: row.position ?? null,
    // 단일 department 표시값도 member_departments(단일 소스)에서 파생 —
    // 구 컬럼(row.department)이 낡아도 검색·상세·통계 화면이 틀리지 않게 한다.
    department: departments.length > 0 ? departments.join(", ") : (row.department ?? null),
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
