import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// 백업 파일 암호화 (AES-256-GCM)
// Vercel Blob은 public 접근만 지원하므로, URL이 노출되어도
// 교인 개인정보를 읽을 수 없도록 내용 자체를 암호화한다.
// 키: BACKUP_ENCRYPTION_KEY (64자리 hex = 32바이트)

const ALG = "aes-256-gcm";

interface EncryptedEnvelope {
  __encrypted: true;
  v: number;
  alg: string;
  iv: string; // base64
  tag: string; // base64
  data: string; // base64
}

function getKey(): Buffer {
  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      "BACKUP_ENCRYPTION_KEY 환경변수가 없거나 형식이 잘못되었습니다 (64자리 hex 필요).",
    );
  }
  return Buffer.from(hex, "hex");
}

export function encryptBackup(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALG, key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const envelope: EncryptedEnvelope = {
    __encrypted: true,
    v: 1,
    alg: ALG,
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  };
  return JSON.stringify(envelope);
}

function isEncryptedEnvelope(value: unknown): value is EncryptedEnvelope {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    v.__encrypted === true &&
    typeof v.iv === "string" &&
    typeof v.tag === "string" &&
    typeof v.data === "string"
  );
}

// 암호화 이전에 저장된 평문 백업은 그대로 반환한다
export function decryptBackup(text: string): string {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  if (!isEncryptedEnvelope(parsed)) return text;

  const key = getKey();
  const decipher = createDecipheriv(ALG, key, Buffer.from(parsed.iv, "base64"));
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
