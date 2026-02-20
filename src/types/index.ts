export interface Member {
  id: string;
  name: string;
  phone: string | null;
  address: string | null;
  detailAddress: string | null;
  birthDate: string | null;
  gender: string | null;
  position: string | null;
  department: string | null;
  district: string | null;
  familyHead: string | null;
  relationship: string | null;
  baptismDate: string | null;
  baptismType: string | null;
  baptismChurch: string | null;
  registrationDate: string | null;
  memberJoinDate: string | null;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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
  familyHead: string;
  relationship: string;
  baptismDate: string;
  baptismType: string;
  baptismChurch: string;
  registrationDate: string;
  memberJoinDate: string;
  notes: string;
}
