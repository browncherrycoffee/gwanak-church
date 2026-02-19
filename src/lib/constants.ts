export const SITE_CONFIG = {
  name: "관악교회",
  description: "관악교회에 오신 것을 환영합니다. 하나님의 사랑과 은혜가 함께하는 교회입니다.",
  url: "https://gwanakchurch.org",
  address: "서울특별시 관악구",
  phone: "02-XXX-XXXX",
  pastorName: "담임목사",
} as const;

export const NAV_ITEMS = [
  { label: "소개", href: "/about" },
  { label: "예배 안내", href: "/worship" },
  { label: "공지사항", href: "/announcements" },
  { label: "설교", href: "/sermons" },
  { label: "오시는 길", href: "/directions" },
  { label: "새가족 안내", href: "/newcomers" },
] as const;

export const ANNOUNCEMENT_CATEGORIES = [
  { value: "일반", label: "일반" },
  { value: "예배", label: "예배" },
  { value: "행사", label: "행사" },
  { value: "교육", label: "교육" },
] as const;

export const SERMON_CATEGORIES = [
  { value: "주일설교", label: "주일설교" },
  { value: "수요설교", label: "수요설교" },
  { value: "특별설교", label: "특별설교" },
] as const;

export const ITEMS_PER_PAGE = 12;
