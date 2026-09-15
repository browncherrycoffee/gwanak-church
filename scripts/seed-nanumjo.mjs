// 일회성: members 테이블에 nanumjo 컬럼 추가 + nanumjo-config.ts 편성표를 DB로 이전
// 사용법: node scripts/seed-nanumjo.mjs [--dry-run]
import { readFileSync, existsSync } from "node:fs";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

// nanumjo-config.ts에서 편성표 파싱 (ts import 대신 정규식)
const src = readFileSync("src/lib/nanumjo-config.ts", "utf8");
const groups = [];
const groupRe = /name:\s*"([^"]+)",\s*members:\s*\[([\s\S]*?)\]/g;
let gm;
while ((gm = groupRe.exec(src)) !== null) {
  const names = [...gm[2].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
  groups.push({ name: gm[1], members: names });
}
console.log("편성표:", groups.map((g) => `${g.name}(${g.members.length})`).join(", "));

const dryRun = process.argv.includes("--dry-run");
const client = postgres(process.env.DATABASE_URL);

if (!dryRun) {
  await client`ALTER TABLE members ADD COLUMN IF NOT EXISTS nanumjo varchar(20)`;
}

const rows = await client`SELECT id, name, member_status FROM members`;
// 이름 매칭: 활동 교인 우선, 동명 구분용 A/B 접미사 제거 버전도 등록
const byName = new Map();
for (const r of rows) {
  if (r.member_status !== "활동") continue;
  byName.set(r.name, r);
  const normalized = r.name.replace(/[ABab]$/, "");
  if (normalized !== r.name && !byName.has(normalized)) byName.set(normalized, r);
}

let updated = 0;
const missing = [];
for (const group of groups) {
  for (const name of group.members) {
    const member = byName.get(name);
    if (!member) {
      missing.push(`${group.name}: ${name}`);
      continue;
    }
    if (!dryRun) {
      await client`
        UPDATE members SET nanumjo = ${group.name}, updated_at = NOW() WHERE id = ${member.id}
      `;
    }
    updated++;
  }
}

console.log(`${dryRun ? "[dry-run] " : ""}배정 완료: ${updated}명`);
if (missing.length) {
  console.log("교적에서 못 찾은 이름 (활동 교인 기준):");
  missing.forEach((m) => console.log(" ", m));
}

const [unassigned] = await client`
  SELECT COUNT(*) AS c FROM members WHERE member_status = '활동' AND (nanumjo IS NULL OR nanumjo = '')
`;
console.log("미배정 활동 교인:", unassigned.c, "명");
await client.end();
