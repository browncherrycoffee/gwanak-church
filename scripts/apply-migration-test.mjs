// 테스트 DB에만 마이그레이션 SQL을 적용한다.
// 안전장치: 접속한 DB 이름이 gwanak_test가 아니면 즉시 중단한다.
// 사용법: node --env-file=.env.test.local scripts/apply-migration-test.mjs [sql파일...]
import { readFileSync, readdirSync } from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [{ db }] = await sql`SELECT current_database() AS db`;
if (db !== "gwanak_test") {
  console.error(`중단: 현재 DB가 '${db}' 입니다. 이 스크립트는 gwanak_test에서만 실행됩니다.`);
  process.exit(1);
}

const files = process.argv.slice(2).length
  ? process.argv.slice(2)
  : readdirSync("drizzle/migrations").filter((f) => f.endsWith(".sql")).sort().map((f) => `drizzle/migrations/${f}`);

for (const file of files) {
  console.log(`적용: ${file}`);
  await sql.unsafe(readFileSync(file, "utf8"));
}

const tables = await sql`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
console.log(`완료 — gwanak_test 테이블:`, tables.map((t) => t.table_name).join(", "));
await sql.end();
