const STORAGE_KEY = "gwanak-pastoral-auth";
const PASTORAL_PIN = "321791";

/** 교인 상세 심방 카드용 — 세션 내 인증 유지 */
export function isPastoralAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

/** 교인 상세 심방 카드용 — PIN 검증 후 세션 저장 */
export function authenticatePastoral(pin: string): boolean {
  if (pin !== PASTORAL_PIN) return false;
  sessionStorage.setItem(STORAGE_KEY, "1");
  return true;
}

/** 심방 목록 페이지용 — 세션 저장 없이 PIN 검증만 */
export function validatePastoralPin(pin: string): boolean {
  return pin === PASTORAL_PIN;
}
