const STORAGE_KEY = "gwanak-pastoral-auth";
const PASTORAL_PIN = "321791";

export function isPastoralAuthenticated(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function authenticatePastoral(pin: string): boolean {
  if (pin !== PASTORAL_PIN) return false;
  sessionStorage.setItem(STORAGE_KEY, "1");
  return true;
}
