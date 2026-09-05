#!/usr/bin/env node
/**
 * 관악교회 교적부 — 백업 복원 스크립트
 *
 * 어떤 백업이든(로컬 .json.gz / 클라우드 암호화 blob URL / 복호화된 .json)
 * members 테이블로 복원합니다.
 *
 * 사용법:
 *   node --env-file=.env.local scripts/restore-backup.mjs <백업파일|URL>            # 리허설 (임시 테이블에 복원 후 검증만, 실데이터 무변경)
 *   node --env-file=.env.local scripts/restore-backup.mjs <백업파일|URL> --commit   # 실제 복원 (members 테이블 교체)
 *
 * 실제 복원은 트랜잭션으로 수행: 기존 데이터를 members_pre_restore_<타임스탬프>
 * 테이블에 통째로 보존한 뒤 교체하므로, 복원 자체도 되돌릴 수 있습니다.
 *
 * 지원 형식:
 *   - 로컬 launchd 백업: gwanak-backup-*_2330.json.gz (snake_case 키, gzip)
 *   - 클라우드 blob 백업: gwanak-backup-*.json (AES-256-GCM 암호화 envelope, camelCase 키)
 *   - decrypt-backup.mjs로 이미 복호화한 .json
 */

import fs from "node:fs";
import zlib from "node:zlib";
import { createDecipheriv } from "node:crypto";
import postgres from "postgres";

const COLUMNS = [
  "id", "name", "phone", "address", "detail_address", "birth_date", "gender",
  "position", "department", "district", "family_members", "family_head",
  "relationship", "baptism_date", "baptism_type", "baptism_church",
  "registration_date", "member_join_date", "car_number", "notes", "photo_url",
  "member_status", "congregation_member", "prayer_requests", "pastoral_visits",
  "created_at", "updated_at",
];
const JSONB_COLUMNS = new Set(["prayer_requests", "pastoral_visits"]);

const camelToSnake = (s) => s.replace(/[A-Z]/g, (c) => "_" + c.toLowerCase());

function decryptEnvelope(payload) {
  const hex = process.env.BACKUP_ENCRYPTION_KEY;
  if (!hex) throw new Error("BACKUP_ENCRYPTION_KEY 환경변수가 없습니다.");
  const decipher = createDecipheriv(
    "aes-256-gcm",
    Buffer.from(hex, "hex"),
    Buffer.from(payload.iv, "base64"),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return JSON.parse(
    Buffer.concat([
      decipher.update(Buffer.from(payload.data, "base64")),
      decipher.final(),
    ]).toString("utf8"),
  );
}

async function loadBackup(source) {
  let raw;
  if (/^https?:\/\//.test(source)) {
    const res = await fetch(source);
    if (!res.ok) throw new Error(`다운로드 실패: HTTP ${res.status}`);
    raw = Buffer.from(await res.arrayBuffer());
  } else {
    raw = fs.readFileSync(source);
  }
  if (raw[0] === 0x1f && raw[1] === 0x8b) raw = zlib.gunzipSync(raw);
  let parsed = JSON.parse(raw.toString("utf8"));
  if (parsed.__encrypted === true) parsed = decryptEnvelope(parsed);
  const rows = Array.isArray(parsed) ? parsed : parsed.members || parsed.data;
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("백업에서 교인 데이터를 찾지 못했습니다.");
  }
  // camelCase(클라우드) / snake_case(로컬) 모두 snake_case로 정규화
  return rows.map((row) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) out[camelToSnake(k)] = v;
    for (const col of COLUMNS) {
      if (!(col in out)) out[col] = null;
      if (JSONB_COLUMNS.has(col) && out[col] !== null && typeof out[col] !== "string") {
        out[col] = JSON.stringify(out[col]);
      }
    }
    return out;
  });
}

async function insertRows(sql, table, rows) {
  const CHUNK = 50;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK).map((r) => {
      const o = {};
      for (const col of COLUMNS) o[col] = r[col];
      return o;
    });
    await sql`INSERT INTO ${sql(table)} ${sql(chunk, ...COLUMNS)}`;
  }
}

const source = process.argv[2];
const commit = process.argv.includes("--commit");
if (!source) {
  console.error("사용법: node --env-file=.env.local scripts/restore-backup.mjs <백업파일|URL> [--commit]");
  process.exit(1);
}

const rows = await loadBackup(source);
console.log(`백업 로드 완료: 교인 ${rows.length}명`);
const emptyNames = rows.filter((r) => !r.name).length;
if (emptyNames > 0) throw new Error(`이름 없는 행 ${emptyNames}개 — 백업 손상 의심, 중단`);

const sql = postgres(process.env.DATABASE_URL, { ssl: "require", max: 1 });
try {
  const [{ cnt: currentCount }] = await sql`SELECT COUNT(*)::int AS cnt FROM members`;
  console.log(`현재 DB: 교인 ${currentCount}명`);

  if (!commit) {
    // 리허설: 임시 테이블에 실제로 복원해보고 검증 후 폐기
    console.log("\n[리허설 모드] 임시 테이블에 복원 테스트 (실데이터 무변경)");
    await sql.begin(async (tx) => {
      await tx`CREATE TEMP TABLE members_restore_test (LIKE members INCLUDING ALL) ON COMMIT DROP`;
      await insertRows(tx, "members_restore_test", rows);
      const [{ cnt }] = await tx`SELECT COUNT(*)::int AS cnt FROM members_restore_test`;
      const [{ named }] = await tx`SELECT COUNT(*)::int AS named FROM members_restore_test WHERE name IS NOT NULL AND name != ''`;
      console.log(`임시 테이블 복원: ${cnt}행 삽입, 이름 보유 ${named}행`);
      if (cnt !== rows.length) throw new Error("행 수 불일치");
    });
    console.log("리허설 성공 — 이 백업은 복원 가능합니다. 실제 복원: --commit 추가");
  } else {
    const stamp = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 12);
    const preTable = `members_pre_restore_${stamp}`;
    console.log(`\n[실제 복원] 기존 데이터를 ${preTable}에 보존 후 교체합니다.`);
    await sql.begin(async (tx) => {
      await tx`CREATE TABLE ${tx(preTable)} AS SELECT * FROM members`;
      await tx`DELETE FROM members`;
      await insertRows(tx, "members", rows);
      const [{ cnt }] = await tx`SELECT COUNT(*)::int AS cnt FROM members`;
      if (cnt !== rows.length) throw new Error(`행 수 불일치(${cnt}≠${rows.length}) — 롤백`);
      console.log(`복원 완료: 교인 ${cnt}명 (이전 데이터: ${preTable} 테이블에 보존)`);
    });
    console.log("되돌리기가 필요하면 보존 테이블에서 같은 방식으로 복원할 수 있습니다.");
  }
} finally {
  await sql.end();
}
