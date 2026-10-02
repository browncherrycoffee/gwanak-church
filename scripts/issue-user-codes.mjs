// 3단계 전용: 배정표(추가 지시서) 기준 27명 사용자 등록 + 접속 코드 일괄 발급.
// - 운영 반영 승인 후에만 --commit으로 실행한다. 기본은 dry-run(명단 대조만).
// - 성도는 이름으로 대조만 하고 새로 만들거나 덮어쓰지 않는다.
// - 발급된 코드는 화면 출력 없이 로컬 파일(전달용 쪽지)에만 저장한다. git 제외 필수.
// 사용법: node --env-file=.env.local scripts/issue-user-codes.mjs [--commit]
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync, existsSync } from "node:fs";
import postgres from "postgres";

const commit = process.argv.includes("--commit");

// ─── 배정표 (2026-10-02 추가 지시서 3번 — 확정 27명) ─────────────────────────
// 미정(지시서 4번): 조용준·김정권 장로 등급, 중고등부SFC·초등부·영유치부 부서장 → 제외
const ROSTER = [
  { name: "이명건", title: "집사", grade: "집사", admin: true,
    assigns: [["nanumjo", "인내조"], ["department", "제3남전도회"]] },
  { name: "유해신", title: "담임목사", grade: "목사", assigns: [] },
  { name: "김재윤", title: "교수목사(협력)", grade: "장로", assigns: [] },
  { name: "류영협", title: "강도사", grade: "행정지원", assigns: [] },
  { name: "안효상", title: "장로", grade: "장로", assigns: [] },
  { name: "차승회", title: "장로", grade: "장로", assigns: [["nanumjo", "희락조"]] },
  { name: "김바우", title: "집사", grade: "집사", assigns: [["nanumjo", "사랑조"]] },
  { name: "김은식", title: "집사", grade: "집사", assigns: [["nanumjo", "자비조"], ["department", "제1남전도회"]] },
  { name: "안진", title: "집사", grade: "집사", assigns: [["nanumjo", "온유조"]] },
  { name: "이지원", title: "집사", grade: "집사", assigns: [["nanumjo", "충성조"]] },
  { name: "최원주", title: "집사", grade: "집사", assigns: [["nanumjo", "양선조"]] },
  { name: "안광우", title: "기관강도사", grade: "집사", assigns: [] },
  { name: "김인용", title: "전도사", grade: "집사", assigns: [] },
  { name: "손효석", title: null, grade: "없음", assigns: [["nanumjo", "화평조"], ["department", "제3남전도회"]] },
  { name: "김성주", title: null, grade: "없음", assigns: [["department", "제1남전도회"]] },
  { name: "이숙희", title: null, grade: "없음", assigns: [["department", "제1여전도회"]] },
  { name: "강미경", title: null, grade: "없음", assigns: [["department", "제1여전도회"]] },
  { name: "안경숙", title: null, grade: "없음", assigns: [["department", "제2여전도회"]] },
  { name: "김금순", title: null, grade: "없음", assigns: [["department", "제2여전도회"]] },
  { name: "이상영", title: null, grade: "없음", assigns: [["department", "제3여전도회"]] },
  { name: "박민아", title: null, grade: "없음", assigns: [["department", "제3여전도회"]] },
  { name: "최형호", title: null, grade: "없음", assigns: [["department", "제4남녀전도회"]] },
  { name: "박형민", title: null, grade: "없음", assigns: [["department", "제4남녀전도회"]] },
  { name: "정다은", title: null, grade: "없음", assigns: [["department", "청년부(직장인)"]] },
  { name: "장민용", title: null, grade: "없음", assigns: [["department", "청년부(직장인)"]] },
  { name: "강보빈", title: null, grade: "없음", assigns: [["department", "청년부(대학 SFC)"]] },
  { name: "김민재", title: null, grade: "없음", assigns: [["department", "청년부(대학 SFC)"]] },
];

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [{ db }] = await sql`SELECT current_database() AS db`;
console.log(`대상 DB: ${db} ${commit ? "(실제 발급)" : "(dry-run — 대조만)"}`);
if (db === "gwanak_test") {
  console.error("중단: 이 스크립트는 실명 배정표를 쓰므로 테스트 DB에서 실행하지 않는다.");
  process.exit(1);
}

function generateCode(usedSet) {
  for (;;) {
    const bytes = randomBytes(12);
    let out = "";
    for (let i = 0; i < 6; i++) out += String(bytes[i] % 10);
    if (!usedSet.has(out)) { usedSet.add(out); return out; }
  }
}
function hashCode(code) {
  const pepper = process.env.AUTH_SECRET;
  if (!pepper) { console.error("AUTH_SECRET이 없습니다 (운영 값 필요)."); process.exit(1); }
  return createHash("sha256").update(`${pepper}:${code}`).digest("hex");
}

// 성도 대조
const members = await sql`SELECT id, name, member_status FROM members`;
const byName = new Map();
for (const m of members) {
  if (!byName.has(m.name)) byName.set(m.name, []);
  byName.get(m.name).push(m);
}

const problems = [];
for (const r of ROSTER) {
  const found = byName.get(r.name) ?? [];
  if (found.length === 0) problems.push(`${r.name}: 교적에 없음`);
  else if (found.length > 1) problems.push(`${r.name}: 동명이인 ${found.length}명 — 수동 확인 필요`);
}
if (problems.length) {
  console.error("대조 실패 — 발급 중단:");
  for (const p of problems) console.error(" ", p);
  process.exit(1);
}
console.log(`대조 완료: 27명 전원 교적에서 1명씩 일치`);

// 기존 사용자 중복 방지 (마이그레이션 전 dry-run에서는 테이블이 없을 수 있음)
let existingNames = new Set();
try {
  const existing = await sql`SELECT display_name FROM app_users`;
  existingNames = new Set(existing.map((e) => e.display_name));
} catch {
  if (commit) {
    console.error("app_users 테이블이 없습니다 — 마이그레이션(0001·0002) 적용 후 실행하세요.");
    process.exit(1);
  }
  console.log("참고: app_users 테이블 없음 (마이그레이션 전) — 중복 검사 생략");
}

const used = new Set();
const sheet = [];
let created = 0;
for (const r of ROSTER) {
  if (existingNames.has(r.name)) {
    console.log(`건너뜀 (이미 등록됨): ${r.name}`);
    continue;
  }
  const memberId = byName.get(r.name)[0].id;
  const code = generateCode(used);
  created++;
  if (commit) {
    const [row] = await sql`
      INSERT INTO app_users (display_name, title, role_grade, is_admin, status, code_hash, code_issued_at, member_id)
      VALUES (${r.name}, ${r.title}, ${r.grade}, ${!!r.admin}, 'active', ${hashCode(code)}, now(), ${memberId})
      RETURNING id`;
    for (const [t, n] of r.assigns) {
      await sql`INSERT INTO user_assignments (user_id, unit_type, unit_name) VALUES (${row.id}, ${t}, ${n})`;
    }
    await sql`INSERT INTO audit_log (actor_user_id, action, target_type, target_id, detail)
      VALUES (NULL, 'user.bulk-issue', 'user', ${row.id}, ${JSON.stringify({ grade: r.grade, admin: !!r.admin, assigns: r.assigns.length })})`;
  }
  const dutyText = r.assigns.map(([t, n]) => (t === "nanumjo" ? `${n} 조장` : `${n} 담당`)).join(", ") || "-";
  sheet.push(`${r.name} (${r.title ?? "직함 없음"} / ${r.grade}${r.admin ? "+관리자" : ""} / ${dutyText})\n  접속 코드: ${code}\n`);
}

if (commit) {
  const outFile = `관악교회 교적부 백업 데이터/접속코드-발급-${new Date().toISOString().slice(0, 10)}.txt`;
  if (!existsSync("관악교회 교적부 백업 데이터")) {
    console.error("출력 폴더가 없습니다 — 로컬 백업 폴더에서 실행하세요.");
    process.exit(1);
  }
  writeFileSync(outFile,
    `관악교회 교적부 접속 코드 (발급 ${new Date().toLocaleString("ko-KR")})\n` +
    `※ 이 파일은 전달 후 삭제하세요. 각 코드는 본인에게만 알려주세요.\n\n` +
    sheet.join("\n"));
  console.log(`발급 완료: ${created}명 → ${outFile} (git 제외 폴더)`);
} else {
  console.log(`dry-run: ${created}명 발급 예정 (코드 미생성·미저장)`);
}
await sql.end();
