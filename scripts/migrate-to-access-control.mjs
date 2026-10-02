// 접근 권한 체계 전환 — 기존 데이터 이관 스크립트
// 1) members.prayer_requests(jsonb) → prayers 테이블 (작성자 미상, legacy_id 보존)
// 2) members.department(단일 문자열) → member_departments (이름 매핑 포함)
// 원본 jsonb·department 컬럼은 절대 지우지 않는다 (추가·복사만).
// 기본은 dry-run. --commit 시에만 실제 기록. 운영 DB 실행은 3단계 승인 후에만.
// 사용법: node --env-file=<env파일> scripts/migrate-to-access-control.mjs [--commit]
import postgres from "postgres";

const commit = process.argv.includes("--commit");
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [{ db }] = await sql`SELECT current_database() AS db`;
console.log(`대상 DB: ${db} ${commit ? "(실제 반영)" : "(dry-run — 변경 없음)"}`);

// 부서 이름 매핑: 구 명칭 → 2026-10 명단 기준 명칭
// 유초등부는 성도별로 초등부/영유치부를 구분할 수 없으므로 3단계 배정표(명단)로 덮어쓰기 전제.
// 여기서는 구 명칭 그대로 옮기되, 아래 매핑만 표준화한다.
const DEPT_RENAME = new Map([
  ["청년부(대학SFC)", "청년부(대학 SFC)"],
  ["중고등부", "중고등부 SFC"],
]);

// ─── 1. 기도제목 이관 ───────────────────────────────────────────────────────
const rows = await sql`
  SELECT id, name, prayer_requests FROM members
  WHERE jsonb_array_length(prayer_requests) > 0`;

let prayerCount = 0;
let skipped = 0;
for (const row of rows) {
  const items = Array.isArray(row.prayer_requests) ? row.prayer_requests : [];
  for (const item of items) {
    if (!item?.content) continue;
    // 이미 이관된 항목은 건너뜀 (legacy_id로 멱등성 보장 — 재실행 안전)
    const [exists] = await sql`
      SELECT 1 FROM prayers WHERE member_id = ${row.id} AND legacy_id = ${String(item.id ?? "")} LIMIT 1`;
    if (exists) { skipped++; continue; }
    prayerCount++;
    if (commit) {
      await sql`
        INSERT INTO prayers (member_id, content, author_user_id, legacy_id, created_at, updated_at)
        VALUES (${row.id}, ${item.content}, NULL, ${String(item.id ?? "")},
                ${item.createdAt ? new Date(item.createdAt) : new Date()},
                ${item.createdAt ? new Date(item.createdAt) : new Date()})`;
    }
  }
}
console.log(`기도제목: 이관 대상 ${prayerCount}건 (이미 이관됨 ${skipped}건) — 전부 "작성자 미상"으로 기록`);

// ─── 2. 부서 소속 이관 ──────────────────────────────────────────────────────
const deptRows = await sql`
  SELECT id, department FROM members
  WHERE department IS NOT NULL AND department != ''`;

let deptCount = 0;
let deptSkipped = 0;
for (const row of deptRows) {
  const dept = DEPT_RENAME.get(row.department) ?? row.department;
  const [exists] = await sql`
    SELECT 1 FROM member_departments WHERE member_id = ${row.id} AND department_name = ${dept} LIMIT 1`;
  if (exists) { deptSkipped++; continue; }
  deptCount++;
  if (commit) {
    await sql`INSERT INTO member_departments (member_id, department_name) VALUES (${row.id}, ${dept})`;
  }
}
console.log(`부서 소속: 이관 대상 ${deptCount}건 (이미 이관됨 ${deptSkipped}건)`);

// ─── 검증 ──────────────────────────────────────────────────────────────────
if (commit) {
  const [p] = await sql`SELECT COUNT(*)::int AS c FROM prayers`;
  const [legacy] = await sql`SELECT COALESCE(SUM(jsonb_array_length(prayer_requests)),0)::int AS c FROM members`;
  const [d] = await sql`SELECT COUNT(*)::int AS c FROM member_departments`;
  console.log(`검증 — prayers ${p.c}건 / 원본 jsonb ${legacy.c}건(보존됨) / member_departments ${d.c}건`);
}
await sql.end();
