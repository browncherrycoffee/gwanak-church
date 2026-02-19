export const SITE_CONFIG = {
  name: "관악교회",
  description: "관악교회 교적부 관리 시스템",
} as const;

export const POSITIONS = [
  "담임목사",
  "교수목사",
  "강도사",
  "전도사",
  "장로",
  "집사",
  "성도",
  "청년",
  "학생",
] as const;

export const DEPARTMENTS = [
  "제1남전도회",
  "제1여전도회",
  "제2여전도회",
  "제3남전도회",
  "제3여전도회",
  "제4전도회",
  "청년부직장인",
  "청년부대학SFC",
  "중고등SFC",
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
