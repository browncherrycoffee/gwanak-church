import type { Member } from "@/types";

const CSV_HEADERS = [
  "이름",
  "연락처",
  "주소",
  "상세주소",
  "생년월일",
  "성별",
  "직분",
  "소속",
  "구역",
  "세대주",
  "관계",
  "세례종류",
  "세례일",
  "세례받은교회",
  "등록일",
  "세례교인회원가입일",
  "활동여부",
  "비고",
];

function escapeCsvField(field: string | null | undefined): string {
  const value = field ?? "";
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function exportMembersCsv(members: Member[]): void {
  const rows = members.map((m) => [
    m.name,
    m.phone,
    m.address,
    m.detailAddress,
    m.birthDate,
    m.gender,
    m.position,
    m.department,
    m.district,
    m.familyHead,
    m.relationship,
    m.baptismType,
    m.baptismDate,
    m.baptismChurch,
    m.registrationDate,
    m.memberJoinDate,
    m.memberStatus,
    m.notes,
  ]);

  const csvContent = [
    CSV_HEADERS.join(","),
    ...rows.map((row) => row.map(escapeCsvField).join(",")),
  ].join("\n");

  // BOM for Korean Excel compatibility
  const bom = "\uFEFF";
  const blob = new Blob([bom + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `관악교회_교적부_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
