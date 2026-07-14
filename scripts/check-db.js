// DB 상태 확인 디버그 스크립트
// 사용법: node scripts/check-db.js [교인이름]
// 접속 정보는 .env.local 의 DATABASE_URL 을 사용한다 (하드코딩 금지).
const { readFileSync, existsSync } = require("node:fs");
const postgres = require("postgres");

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL이 없습니다. .env.local을 확인하세요.");
  process.exit(1);
}

const client = postgres(process.env.DATABASE_URL);

async function main() {
  const name = process.argv[2];
  if (name) {
    const rows = await client`
      SELECT id, name, car_number, updated_at FROM members WHERE name = ${name}
    `;
    console.log(`${name} DB:`, JSON.stringify(rows, null, 2));
  }

  const [stat] = await client`
    SELECT COUNT(*) AS count, MAX(updated_at) AS latest_updated, MAX(created_at) AS latest_created
    FROM members
  `;
  console.log("교인 수:", stat.count, "| 최근 수정:", stat.latest_updated, "| 최근 생성:", stat.latest_created);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
