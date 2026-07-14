// 일회성 마이그레이션: 기존 평문 백업 blob을 전부 암호화된 내용으로 덮어쓴다.
// 1) 평문 원본은 로컬 아카이브 폴더(gitignore됨)에 먼저 저장
// 2) 같은 pathname으로 암호화 내용 덮어쓰기 (allowOverwrite)
// 사용법: node scripts/reencrypt-blobs.mjs
import { createCipheriv, randomBytes } from "node:crypto";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { list, put } from "@vercel/blob";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const keyHex = process.env.BACKUP_ENCRYPTION_KEY;
if (!keyHex || !/^[0-9a-fA-F]{64}$/.test(keyHex)) {
  console.error("BACKUP_ENCRYPTION_KEY가 없습니다.");
  process.exit(1);
}
const key = Buffer.from(keyHex, "hex");

function encrypt(plaintext) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return JSON.stringify({
    __encrypted: true,
    v: 1,
    alg: "aes-256-gcm",
    iv: iv.toString("base64"),
    tag: cipher.getAuthTag().toString("base64"),
    data: data.toString("base64"),
  });
}

// 교적부 백업 파일만 대상 (다른 앱의 state.json은 건드리지 않음)
const TARGET_RE = /^gwanak-(backup-|members-backup)/;

const archiveDir = `관악교회 교적부 백업 데이터/blob-archive-${new Date().toISOString().slice(0, 10)}`;
mkdirSync(archiveDir, { recursive: true });

const { blobs } = await list({ limit: 1000 });
const targets = blobs.filter((b) => TARGET_RE.test(b.pathname));
console.log(`대상 blob: ${targets.length}개 (전체 ${blobs.length}개 중)`);

let encrypted = 0;
let skipped = 0;
for (const b of targets) {
  const res = await fetch(`${b.url}?_t=${Date.now()}`, { cache: "no-store" });
  if (!res.ok) {
    console.error(`  다운로드 실패 (HTTP ${res.status}): ${b.pathname}`);
    continue;
  }
  const text = await res.text();

  let alreadyEncrypted = false;
  try {
    alreadyEncrypted = JSON.parse(text)?.__encrypted === true;
  } catch {}
  if (alreadyEncrypted) {
    skipped++;
    continue;
  }

  const localName = b.pathname.replaceAll("/", "_") + (b.pathname.endsWith(".json") ? "" : ".json");
  writeFileSync(`${archiveDir}/${localName}`, text);

  await put(b.pathname, encrypt(text), {
    access: "public",
    contentType: "application/json",
    allowOverwrite: true,
  });
  encrypted++;
  console.log(`  암호화 완료: ${b.pathname}`);
}

console.log(`\n완료 — 암호화 ${encrypted}개, 이미 암호화됨 ${skipped}개`);
console.log(`평문 원본 로컬 보관: ${archiveDir}/`);
