// 암호화된 백업 파일(blob 스냅샷) 복호화 도구
// 사용법: node scripts/decrypt-backup.mjs <파일경로 또는 URL> [출력파일.json]
// 키는 .env.local 의 BACKUP_ENCRYPTION_KEY 를 사용한다.
import { createDecipheriv } from "node:crypto";
import { readFileSync, writeFileSync, existsSync } from "node:fs";

function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  }
}

function decrypt(text) {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return text;
  }
  if (parsed?.__encrypted !== true) return text; // 평문 백업

  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!hex || !/^[0-9a-fA-F]{64}$/.test(hex)) {
    console.error("BACKUP_ENCRYPTION_KEY가 없습니다. .env.local을 확인하세요.");
    process.exit(1);
  }
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(hex, "hex"),
    Buffer.from(parsed.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(parsed.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(parsed.data, "base64")),
    decipher.final(),
  ]).toString("utf8");
}

const [, , input, output] = process.argv;
if (!input) {
  console.error("사용법: node scripts/decrypt-backup.mjs <파일경로 또는 URL> [출력파일.json]");
  process.exit(1);
}

loadEnv();

const raw = input.startsWith("http")
  ? await fetch(input).then((r) => {
      if (!r.ok) throw new Error(`다운로드 실패: HTTP ${r.status}`);
      return r.text();
    })
  : readFileSync(input, "utf8");

const plaintext = decrypt(raw);
const payload = JSON.parse(plaintext);

if (output) {
  writeFileSync(output, JSON.stringify(payload, null, 2));
  console.log(`복호화 완료 → ${output} (교인 ${payload.count ?? payload.members?.length ?? "?"}명, ${payload.exportedAt ?? ""})`);
} else {
  process.stdout.write(JSON.stringify(payload, null, 2));
}
