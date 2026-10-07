// 교적부 시스템 종합 헬스체크
// 점검 항목: 사이트 가동, 백업 최신성, 백업 복호화·무결성, DB 접속·데이터 정합성,
//           접속 코드 로그인 시스템, 권한 체계 테이블(사용자·기도제목·심방), 백업 v2 포함 여부
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
    // v2 백업: 권한 체계 데이터(사용자·기도제목·심방) 포함 확인
    if (parsed.version >= 2) {
      const a = parsed.access ?? {};
      const accessOk = Array.isArray(a.appUsers) && a.appUsers.length > 0 && Array.isArray(a.prayers);
      report("백업 권한데이터", accessOk,
        `사용자 ${a.appUsers?.length ?? 0}명, 기도제목 ${a.prayers?.length ?? 0}건, 심방 ${a.pastoralRecords?.length ?? 0}건 포함`);
    } else {
      report("백업 권한데이터", false, `백업 버전 ${parsed.version} — v2(권한 데이터 포함) 아님`);
    }
    return { memberCount: members?.length, accessPrayers: parsed.access?.prayers?.length };
  } catch (e) {
    report("백업 무결성", false, `복호화 실패: ${e.message}`);
  }
}

// 4. DB 접속 + 데이터 정합성 (교인·기도제목 수가 백업과 크게 다르면 경고)
async function checkDatabase(backupInfo) {
  try {
    const { default: postgres } = await import("postgres");
    const sql = postgres(DATABASE_URL, { ssl: "require", max: 1, connect_timeout: 15 });
    const [row] = await sql`
      SELECT COUNT(*)::int AS cnt, MAX(updated_at) AS last_update FROM members
    `;
    report("DB 접속", row.cnt > 0, `교인 ${row.cnt}명, 마지막 수정 ${row.last_update?.toISOString?.() ?? row.last_update}`);
    if (backupInfo?.memberCount != null) {
      // 하루 사이 10% 이상 감소는 비정상 (대량 삭제/소실 의심)
      const ok = row.cnt >= backupInfo.memberCount * 0.9;
      report("데이터 정합성", ok, `DB ${row.cnt}명 vs 백업 ${backupInfo.memberCount}명`);
    }

    // 로그인 공격 감시: 최근 24시간 실패 횟수 (50회 초과 = 무차별 대입 의심)
    const [atk] = await sql`
      SELECT COUNT(*)::int AS fails,
             COUNT(DISTINCT ip)::int AS ips
      FROM login_attempts WHERE success = false AND created_at > now() - interval '24 hours'
    `;
    report("로그인 공격 감시", atk.fails <= 50,
      `24시간 내 실패 ${atk.fails}회 (IP ${atk.ips}개)${atk.fails > 50 ? " — 무차별 대입 의심!" : ""}`);

    // 권한 체계 테이블 점검
    const [acc] = await sql`
      SELECT
        (SELECT COUNT(*)::int FROM app_users WHERE status='active') AS users,
        (SELECT COUNT(*)::int FROM app_users WHERE is_admin AND status='active') AS admins,
        (SELECT COUNT(*)::int FROM prayers) AS prayers,
        (SELECT COUNT(*)::int FROM pastoral_records) AS pastoral,
        (SELECT COUNT(*)::int FROM sessions WHERE expires_at > now()) AS live_sessions
    `;
    const accOk = acc.users > 0 && acc.admins > 0 && acc.prayers > 0;
    report("권한 체계", accOk,
      `사용자 ${acc.users}명(관리자 ${acc.admins}), 기도제목 ${acc.prayers}건, 심방 ${acc.pastoral}건, 유효 세션 ${acc.live_sessions}개`);
    if (backupInfo?.accessPrayers != null) {
      const ok = acc.prayers >= backupInfo.accessPrayers * 0.9;
      report("기도제목 정합성", ok, `DB ${acc.prayers}건 vs 백업 ${backupInfo.accessPrayers}건`);
    }
    await sql.end();
  } catch (e) {
    report("DB 접속", false, e.message);
  }
}

// 5. 접속 코드 로그인 시스템: 로그인 화면 응답 + 잘못된 코드가 정확히 거부되는지
async function checkLoginSystem() {
  try {
    const page = await fetch(`${SITE_URL}/login`, { redirect: "manual" });
    const res = await fetch(`${SITE_URL}/api/auth`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: "000000" }),
    });
    // 401(거부) 또는 429(시도 제한 작동)면 정상 — 200이면 심각한 문제
    const ok = page.status === 200 && (res.status === 401 || res.status === 429);
    report("로그인 시스템", ok, `로그인 화면 ${page.status}, 잘못된 코드 → ${res.status} (401/429=정상 거부)`);
  } catch (e) {
    report("로그인 시스템", false, e.message);
  }
}

await checkSite();
const latest = await checkBackupFreshness();
const backupInfo = await checkBackupIntegrity(latest);
await checkDatabase(backupInfo);
await checkLoginSystem();

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
