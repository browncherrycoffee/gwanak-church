import { createHash, randomBytes } from "node:crypto";

// 접속 코드: GW-XXXX-XXXX-XXXX-XXXX
// 혼동 문자(0,O,1,I,L) 제외 31자 알파벳 × 16자리 ≈ 79비트 — 추측 불가
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
const CODE_LENGTH = 16;

export function generateAccessCode(): string {
  const bytes = randomBytes(CODE_LENGTH * 2);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    // modulo bias 제거: 두 바이트씩 사용
    const v = (bytes[i * 2]! << 8) | bytes[i * 2 + 1]!;
    out += ALPHABET[v % ALPHABET.length];
  }
  return `GW-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}

// 입력 정규화: 대소문자·붙임표·공백 무시, 혼동 문자 교정(O→0은 불가하므로 제외했음)
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[^A-Z2-9]/g, "");
}

// 해시: 코드 자체가 고엔트로피 무작위 값이므로 pepper를 더한 SHA-256으로 충분
// (사람이 정한 비밀번호가 아니므로 느린 해시가 필요 없음)
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
