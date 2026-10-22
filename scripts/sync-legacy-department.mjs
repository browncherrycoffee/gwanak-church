// 구 단일 컬럼 members.department를 단일 소스 member_departments와 동기화.
// 화면은 member-serialize가 member_departments에서 파생하므로 이 컬럼은 2차 복사본이지만,
// 백업·CSV·과거 코드 경로가 낡은 값을 보지 않도록 주기적으로 맞춰 둔다.
// 사용법: set -a && source .env.local && set +a && node scripts/sync-legacy-department.mjs
// 개인 정보(이름 등)는 출력하지 않는다 — 건수만 보고.
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL 필요");
  process.exit(1);
}
const sql = postgres(url, { max: 1 });

const [{ db }] = await sql`SELECT current_database() AS db`;
console.log(`대상 DB: ${db}`);

const before = await sql`
  WITH agg AS (
    SELECT member_id, string_agg(department_name, ', ' ORDER BY department_name) AS depts
    FROM member_departments GROUP BY member_id
  )
  SELECT COUNT(*) AS n FROM members m LEFT JOIN agg a ON a.member_id = m.id
  WHERE m.department IS DISTINCT FROM a.depts`;
console.log(`불일치: ${before[0].n}명`);

if (Number(before[0].n) > 0) {
  const updated = await sql`
    WITH agg AS (
      SELECT member_id, string_agg(department_name, ', ' ORDER BY department_name) AS depts
      FROM member_departments GROUP BY member_id
    )
    UPDATE members m
    SET department = a.depts
    FROM (SELECT m2.id, a2.depts FROM members m2 LEFT JOIN agg a2 ON a2.member_id = m2.id) a
    WHERE a.id = m.id AND m.department IS DISTINCT FROM a.depts
    RETURNING m.id`;
  console.log(`동기화 완료: ${updated.length}명 (updated_at은 건드리지 않음 — 폴링 전체 재전송 방지)`);
}

const after = await sql`
  WITH agg AS (
    SELECT member_id, string_agg(department_name, ', ' ORDER BY department_name) AS depts
    FROM member_departments GROUP BY member_id
  )
  SELECT COUNT(*) AS n FROM members m LEFT JOIN agg a ON a.member_id = m.id
  WHERE m.department IS DISTINCT FROM a.depts`;
console.log(`잔여 불일치: ${after[0].n}명`);
await sql.end();
process.exit(Number(after[0].n) > 0 ? 1 : 0);
