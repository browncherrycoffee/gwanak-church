import type { MemberFormData } from "@/types";

// Fields that map directly to string fields
type StringFormField = Exclude<keyof MemberFormData, "familyMembers">;

const HEADER_MAP: Record<string, StringFormField | "familyMembers"> = {
  "이름": "name",
  "연락처": "phone",
  "주소": "address",
  "상세주소": "detailAddress",
  "생년월일": "birthDate",
  "성별": "gender",
  "직분": "position",
  "소속": "department",
  "구역": "district",
  "가족": "familyMembers",
  // legacy compat
  "세대주": "familyMembers",
  "세례종류": "baptismType",
  "세례일": "baptismDate",
  "세례받은교회": "baptismChurch",
  "등록일": "registrationDate",
  "세례교인회원가입일": "memberJoinDate",
  "활동여부": "memberStatus",
  "비고": "notes",
};

function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current.trim());
  return fields;
}

export function parseCsvImport(csvText: string): { members: MemberFormData[]; errors: string[] } {
  const errors: string[] = [];
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());

  if (lines.length < 2) {
    return { members: [], errors: ["CSV 파일에 데이터가 없습니다."] };
  }

  const headerLine = lines[0];
  if (!headerLine) {
    return { members: [], errors: ["헤더 행이 없습니다."] };
  }

  const cleanHeader = headerLine.replace(/^\uFEFF/, "");
  const headers = parseCsvLine(cleanHeader);

  const columnMap: Array<StringFormField | "familyMembers" | null> = headers.map((h) => {
    return HEADER_MAP[h] ?? null;
  });

  const nameIndex = columnMap.indexOf("name");
  if (nameIndex === -1) {
    return { members: [], errors: ["'이름' 열을 찾을 수 없습니다. 첫 번째 행에 '이름' 헤더가 필요합니다."] };
  }

  const members: MemberFormData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line || !line.trim()) continue;

    const fields = parseCsvLine(line);
    const member: MemberFormData = {
      name: "",
      phone: "",
      address: "",
      detailAddress: "",
      birthDate: "",
      gender: "",
      position: "성도",
      department: "",
      district: "",
      familyMembers: [],
      baptismDate: "",
      baptismType: "",
      baptismChurch: "",
      registrationDate: new Date().toISOString().slice(0, 10),
      memberJoinDate: "",
      memberStatus: "활동",
      carNumber: "",
      notes: "",
      photoUrl: "",
    };

    for (let j = 0; j < fields.length; j++) {
      const key = columnMap[j];
      const value = fields[j] ?? "";
      if (!key || !value) continue;
      if (key === "familyMembers") {
        member.familyMembers = value.split("/").map((n) => n.trim()).filter(Boolean);
      } else {
        (member as unknown as Record<string, unknown>)[key] = value;
      }
    }

    if (!member.name.trim()) {
      errors.push(`${i + 1}행: 이름이 비어 있어 건너뜁니다.`);
      continue;
    }

    members.push(member);
  }

  return { members, errors };
}
