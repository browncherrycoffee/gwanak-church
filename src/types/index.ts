export interface PrayerRequest {
  id: string;
  content: string;
  createdAt: string; // ISO string
}

export interface PastoralVisit {
  id: string;
  visitedAt: string; // "YYYY-MM-DD"
  content: string;
  createdAt: string;
}

export interface Member {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  detailAddress: string | null;
  birthDate: string | null;
  gender: string | null;
  position: string | null;
  department: string | null; // 구버전 단일 부서 (참고용 보존)
  departments?: string[]; // 새 다중 부서 소속
  district: string | null;
  // 나눔조 (구버전 백업에는 없을 수 있어 optional)
  nanumjo?: string | null;
  familyMembers: string[];
  // legacy fields kept for migration compat
  familyHead?: string | null;
  relationship?: string | null;
  baptismDate: string | null;
  baptismType: string | null;
  baptismChurch: string | null;
  registrationDate: string | null;
  memberJoinDate: string | null;
  carNumber: string | null;
  notes: string | null;
  photoUrl: string | null;
  memberStatus: string;
  // 공동의회회원 여부 (구버전 백업에는 없을 수 있어 optional)
  congregationMember?: boolean;
  prayerRequests: PrayerRequest[];
  pastoralVisits: PastoralVisit[];
  createdAt: string;
  updatedAt: string;
}

// 직분 없는 조장·부서장에게 보내는 축소 정보 — 이름·소속만
export interface MemberNameOnly {
  id: string;
  name: string;
  nanumjo: string | null;
  departments: string[];
  memberStatus: string;
  nameOnly: true;
}

export interface MemberFormData {
  name: string;
  phone: string;
  address: string;
  detailAddress: string;
  birthDate: string;
  gender: string;
  position: string;
  department: string;
  district: string;
  nanumjo: string;
  familyMembers: string[];
  baptismDate: string;
  baptismType: string;
  baptismChurch: string;
  registrationDate: string;
  memberJoinDate: string;
  memberStatus: string;
  congregationMember?: boolean;
  carNumber: string;
  notes: string;
  photoUrl: string;
}
