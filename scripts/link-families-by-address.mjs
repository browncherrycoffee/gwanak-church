// 집주소(주소+상세주소)가 동일한 교인들을 가족으로 자동 매칭한다.
// - 그룹 내 모든 쌍을 양방향으로 family_members에 추가 (기존 가족 링크는 유지)
// - 변경된 교인은 updated_at 갱신 → 접속 중인 기기들이 폴링으로 자동 최신화
// 사용법: node scripts/link-families-by-address.mjs [--dry-run]
import { readFileSync, existsSync } from "node:fs";
import postgres from "postgres";

for (const file of [".env.local", ".env"]) {
  if (!existsSync(file)) continue;
  for (const line of readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^([A-Z_]+)="?([^"]*)"?$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const dryRun = process.argv.includes("--dry-run");
const client = postgres(process.env.DATABASE_URL);
const norm = (s) => (s ?? "").trim().replace(/\s+/g, " ");

const rows = await client`
  SELECT id, name, address, detail_address, family_members FROM members
`;

const byAddr = new Map();
for (const r of rows) {
  const addr = norm(r.address);
  if (!addr) continue;
  const key = `${addr}|${norm(r.detail_address)}`;
  if (!byAddr.has(key)) byAddr.set(key, []);
  byAddr.get(key).push(r);
}

let updatedCount = 0;
let addedLinks = 0;

for (const [key, group] of byAddr) {
  if (group.length < 2) continue;
  const names = group.map((g) => g.name);

  for (const member of group) {
    const existing = (member.family_members ?? []).map((n) => n.trim()).filter(Boolean);
    const have = new Set(existing);
    const toAdd = names.filter((n) => n !== member.name && !have.has(n));
    if (toAdd.length === 0) continue;

    const next = [...existing, ...toAdd];
    addedLinks += toAdd.length;
    updatedCount++;
    console.log(`  ${member.name} += [${toAdd.join(", ")}]  @ ${key.slice(0, 50)}`);

    if (!dryRun) {
      await client`
        UPDATE members
        SET family_members = ${next}, updated_at = NOW()
        WHERE id = ${member.id}
      `;
    }
  }
}

console.log(
  `\n${dryRun ? "[dry-run] " : ""}완료 — 교인 ${updatedCount}명 업데이트, 가족 링크 ${addedLinks}개 추가`,
);
await client.end();
