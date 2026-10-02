export const SITE_CONFIG = {
  name: "관악교회",
  description: "관악교회 교적부 관리 시스템",
} as const;

export const POSITIONS = [
  "담임목사",
  "목사",
  "강도사",
  "전도사",
  "장로",
  "집사",
  "성도",
] as const;

// 직분 정렬 순서 (목록/통계에서 사용)
export const POSITION_ORDER: string[] = [
  "담임목사", "목사", "강도사", "전도사", "장로", "집사", "성도",
];

// 2026-10 부서 체계 (member_departments 테이블·담당 지정과 이름이 정확히 일치해야 함)
export const DEPARTMENTS = [
  "제1남전도회",
  "제1여전도회",
  "제2여전도회",
  "제3남전도회",
  "제3여전도회",
  "제4남녀전도회",
  "청년부(직장인)",
  "청년부(대학 SFC)",
  "중고등부 SFC",
  "초등부",
  "영유치부",
] as const;

export const BAPTISM_TYPES = [
  "유아세례",
  "학습",
  "세례",
  "입교",
  "원입성도",
  "해당없음",
] as const;

export const GENDERS = ["남", "여"] as const;

export const RELATIONSHIPS = [
  "본인(세대주)",
  "배우자",
  "자녀",
  "부모",
  "형제/자매",
  "기타",
] as const;

export const MEMBER_STATUSES = ["활동", "비활동", "제적"] as const;

export const ITEMS_PER_PAGE = 20;
