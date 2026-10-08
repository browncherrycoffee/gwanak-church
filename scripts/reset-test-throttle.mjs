// 테스트 DB 전용: 시도 제한 기록 초기화 (테스트 간 간섭 방지)
import postgres from "postgres";
const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [{ db }] = await sql`SELECT current_database() AS db`;
if (db !== "gwanak_test") {
  console.error(`중단: ${db}는 테스트 DB가 아님`);
  process.exit(1);
}
await sql`TRUNCATE login_attempts`;
console.log("테스트 DB 시도 기록 초기화");
await sql.end();
