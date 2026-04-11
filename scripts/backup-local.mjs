#!/usr/bin/env node
/**
 * 관악교회 교적부 — 로컬 Mac 자동 백업 스크립트
 *
 * Neon Postgres에 직접 연결해 members 테이블 전체를 스냅샷으로 저장합니다.
 * 웹 계층(Vercel) 의존 없이 DB만 살아있으면 백업이 성공하므로, 가장 견고한 경로입니다.
 *
 * 출력: /Users/browncherry/gwanak/관악교회 교적부 백업 데이터/gwanak-backup-YYYY-MM-DD_HHMM.json.gz
 * 로그: 같은 폴더의 backup.log (한 줄씩 append)
 *
 * 실행:
 *   node --env-file=.env.local scripts/backup-local.mjs
 *
 * 환경변수(.env.local에 있어야 함):
 *   DATABASE_URL=postgresql://...
 */

import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import postgres from "postgres";

const REPO_ROOT = path.resolve(new URL("..", import.meta.url).pathname);
const BACKUP_DIR = path.join(REPO_ROOT, "관악교회 교적부 백업 데이터");
const LOG_FILE = path.join(BACKUP_DIR, "backup.log");
const LATEST_FILE = path.join(BACKUP_DIR, "latest.json.gz");

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

function kstNow() {
  return new Date(Date.now() + KST_OFFSET_MS);
}

function formatTimestamp(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getUTCFullYear();
  const mm = pad(d.getUTCMonth() + 1);
  const dd = pad(d.getUTCDate());
  const hh = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  return { date: `${yyyy}-${mm}-${dd}`, time: `${hh}${mi}`, stamp: `${yyyy}-${mm}-${dd}_${hh}${mi}` };
}

function appendLog(line) {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    fs.appendFileSync(LOG_FILE, line + "\n", "utf8");
  } catch (e) {
    console.error("[backup-local] 로그 작성 실패:", e);
  }
}

async function main() {
  const startedAt = new Date();
  const kst = kstNow();
  const { date, time, stamp } = formatTimestamp(kst);

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    const msg = `[${date} ${time}] FAIL — DATABASE_URL 미설정`;
    appendLog(msg);
    console.error(msg);
    process.exit(2);
  }

  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const sql = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 20,
    prepare: false,
  });

  try {
    const rows = await sql`SELECT * FROM members ORDER BY created_at DESC`;
    const payload = {
      version: 1,
      backupType: "local-mac-snapshot",
      exportedAt: startedAt.toISOString(),
      exportedAtKst: `${date} ${time.slice(0, 2)}:${time.slice(2)}`,
      count: rows.length,
      members: rows,
    };

    const json = JSON.stringify(payload);
    const gz = zlib.gzipSync(Buffer.from(json, "utf8"), { level: 9 });

    const filename = `gwanak-backup-${stamp}.json.gz`;
    const finalPath = path.join(BACKUP_DIR, filename);
    const tmpPath = finalPath + ".tmp";

    // 원자적 쓰기: tmp → rename
    fs.writeFileSync(tmpPath, gz);
    fs.renameSync(tmpPath, finalPath);

    // latest.json.gz 복사본 갱신
    const latestTmp = LATEST_FILE + ".tmp";
    fs.writeFileSync(latestTmp, gz);
    fs.renameSync(latestTmp, LATEST_FILE);

    const elapsedMs = Date.now() - startedAt.getTime();
    const msg = `[${date} ${time}] OK — ${rows.length}명 · ${json.length.toLocaleString()}B → ${gz.length.toLocaleString()}B (${filename}) · ${elapsedMs}ms`;
    appendLog(msg);
    console.info(msg);
  } catch (err) {
    const msg = `[${date} ${time}] FAIL — ${err?.message ?? err}`;
    appendLog(msg);
    console.error(msg);
    process.exitCode = 1;
  } finally {
    try { await sql.end({ timeout: 5 }); } catch { /* ignore */ }
  }
}

main().catch((err) => {
  console.error("[backup-local] 예상치 못한 오류:", err);
  process.exit(1);
});
