// 교적부 시스템 종합 헬스체크
// 점검 항목: 사이트 가동, 백업 최신성, 백업 복호화·무결성, DB 접속·데이터 정합성
// 실패 항목이 하나라도 있으면 exit 1 (GitHub Actions 실패 → 이메일 알림)
import { createDecipheriv } from "node:crypto";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const DATABASE_URL = process.env.DATABASE_URL;
const BACKUP_KEY = process.env.BACKUP_ENCRYPTION_KEY;
const SITE_URL = "https://gwanak-church.vercel.app";

const results = [];
function report(name, ok, detail) {
  results.push({ name, ok, detail });
  console.log(`${ok ? "✅" : "❌"} ${name}: ${detail}`);
}

// 1. 사이트 가동 확인 (로그인 리다이렉트 = 정상)
async function checkSite() {
  try {
    const res = await fetch(SITE_URL, { redirect: "manual" });
    const ok = res.status === 307 || res.status === 200 || res.status === 308;
    report("사이트 가동", ok, `HTTP ${res.status}`);
  } catch (e) {
    report("사이트 가동", false, e.message);
  }
}

// 2. 백업 최신성: 최근 26시간 내 일일 백업 존재
async function checkBackupFreshness() {
  try {
    const res = await fetch(
      "https://blob.vercel-storage.com/?prefix=gwanak-backup-&limit=1000",
      { headers: { authorization: `Bearer ${BLOB_TOKEN}` } }
    );
    const { blobs } = await res.json();
    const daily = blobs
      .filter((b) => /gwanak-backup-\d{4}-\d{2}-\d{2}-\d{4}\.json/.test(b.pathname))
      .sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
    if (!daily.length) return report("백업 최신성", false, "일일 백업 없음");
    const latest = daily[0];
    const ageHours = (Date.now() - new Date(latest.uploadedAt)) / 3600000;
    report(
      "백업 최신성",
      ageHours <= 26,
      `${latest.pathname} (${ageHours.toFixed(1)}시간 전, 총 ${daily.length}개)`
    );
    return latest;
  } catch (e) {
    report("백업 최신성", false, e.message);
  }
}

// 3. 백업 복호화 + 교인 수 추출 (AES-256-GCM, src/lib/backup-crypto.ts와 동일 포맷)
async function checkBackupIntegrity(latestBlob) {
  if (!latestBlob) return report("백업 무결성", false, "최신 백업 없음 - 건너뜀");
  try {
    const res = await fetch(latestBlob.url);
    const payload = await res.json();
    let parsed;
    if (payload.__encrypted === true) {
      const key = Buffer.from(BACKUP_KEY, "hex");
      const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
      decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
      const plain = Buffer.concat([
        decipher.update(Buffer.from(payload.data, "base64")),
        decipher.final(),
      ]).toString("utf8");
      parsed = JSON.parse(plain);
    } else {
      parsed = payload;
    }
    const members = Array.isArray(parsed) ? parsed : parsed.members || parsed.data;
    const ok = Array.isArray(members) && members.length > 0;
    report("백업 무결성", ok, `복호화 성공, 교인 ${members?.length ?? 0}명`);
    return members?.length;
  } catch (e) {
    report("백업 무결성", false, `복호화 실패: ${e.message}`);
  }
}

// 4. DB 접속 + 데이터 정합성 (교인 수가 백업과 크게 다르면 경고)
async function checkDatabase(backupCount) {
  try {
    const { default: postgres } = await import("postgres");
    const sql = postgres(DATABASE_URL, { ssl: "require", max: 1, connect_timeout: 15 });
    const [row] = await sql`
      SELECT COUNT(*)::int AS cnt, MAX(updated_at) AS last_update FROM members
    `;
    await sql.end();
    report("DB 접속", row.cnt > 0, `교인 ${row.cnt}명, 마지막 수정 ${row.last_update?.toISOString?.() ?? row.last_update}`);
    if (backupCount != null) {
      // 하루 사이 10% 이상 감소는 비정상 (대량 삭제/소실 의심)
      const ok = row.cnt >= backupCount * 0.9;
      report("데이터 정합성", ok, `DB ${row.cnt}명 vs 백업 ${backupCount}명`);
    }
  } catch (e) {
    report("DB 접속", false, e.message);
  }
}

await checkSite();
const latest = await checkBackupFreshness();
const backupCount = await checkBackupIntegrity(latest);
await checkDatabase(backupCount);

const failed = results.filter((r) => !r.ok);
console.log(
  `\n=== 헬스체크 ${failed.length === 0 ? "전체 통과" : `실패 ${failed.length}건`} (${results.length}개 항목) ===`
);

// 텔레그램 보고: 정상이면 한 줄 요약, 실패 시 상세 경고
// (매일 도착 자체가 감시 시스템 생존 신호 역할도 함)
async function sendTelegram() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return console.log("텔레그램 미설정 - 보고 생략");
  const lines =
    failed.length === 0
      ? [
          "✅ [교적부 헬스체크] 전체 통과",
          ...results.map((r) => `· ${r.name}: ${r.detail}`),
        ]
      : [
          `🚨 [교적부 헬스체크] 실패 ${failed.length}건 — 즉시 확인 필요`,
          ...results.map((r) => `${r.ok ? "✅" : "❌"} ${r.name}: ${r.detail}`),
        ];
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: lines.join("\n") }),
    });
    const body = await res.json();
    console.log("텔레그램 보고:", body.ok ? "발송 완료" : `실패 ${JSON.stringify(body)}`);
  } catch (e) {
    console.log("텔레그램 보고 실패:", e.message);
  }
}
await sendTelegram();

if (failed.length > 0) process.exit(1);
