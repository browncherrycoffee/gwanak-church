import { createHash, randomInt, randomBytes } from "node:crypto";

// 접속 코드: 숫자 6자리 (사용자 결정 2026-10-02 — 지시서의 "추측 불가 길이" 요구 대신
// 입력 편의를 우선. 짧은 길이는 DB 기반 시도 제한(login-throttle)으로 보완한다.)
const CODE_LENGTH = 6;

export function generateAccessCode(): string {
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) out += String(randomInt(0, 10));
  return out;
}

// 입력 정규화: 숫자 외 문자(공백·하이픈 등) 제거
export function normalizeCode(input: string): string {
  return input.replace(/[^0-9]/g, "");
}

// 해시: pepper(AUTH_SECRET, DB 밖 비밀값)를 더한 SHA-256.
// 6자리는 pepper 없이는 사전 공격에 취약하므로 pepper가 필수 방어선이다.
export function hashCode(code: string): string {
  const pepper = process.env.AUTH_SECRET || "";
  return createHash("sha256").update(`${pepper}:${normalizeCode(code)}`).digest("hex");
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function generateSessionToken(): string {
  return randomBytes(32).toString("hex");
}
