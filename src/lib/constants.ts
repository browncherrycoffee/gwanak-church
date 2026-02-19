export const SITE_CONFIG = {
  name: "관악교회",
  description: "관악교회 교적부 관리 시스템",
} as const;

export const POSITIONS = [
  "담임목사",
  "부목사",
  "전도사",
  "장로",
  "권사",
  "안수집사",
  "집사",
  "성도",
  "청년",
  "학생",
] as const;

export const DEPARTMENTS = [
  "1부 예배",
  "2부 예배",
  "3부 예배",
  "청년부",
  "중고등부",
  "초등부",
  "유아부",
  "영아부",
  "찬양대",
  "성가대",
] as const;

export const BAPTISM_TYPES = [
  "유아세례",
  "학습",
  "세례",
  "입교",
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

export const ITEMS_PER_PAGE = 20;
