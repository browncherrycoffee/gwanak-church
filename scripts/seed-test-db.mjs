// 테스트 DB(gwanak_test) 전용 가짜 데이터 시드.
// 실제 성도 이름·정보는 절대 넣지 않는다. 접속 코드는 가짜 사용자용 테스트 코드다.
// 사용법: node --env-file=.env.test.local scripts/seed-test-db.mjs
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import postgres from "postgres";

const sql = postgres(process.env.DATABASE_URL, { max: 1 });
const [{ db }] = await sql`SELECT current_database() AS db`;
if (db !== "gwanak_test") {
  console.error(`중단: 현재 DB가 '${db}' — 이 스크립트는 gwanak_test에서만 실행된다.`);
  process.exit(1);
}

const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";
function generateCode() {
  const bytes = randomBytes(32);
  let out = "";
  for (let i = 0; i < 16; i++) {
    const v = (bytes[i * 2] << 8) | bytes[i * 2 + 1];
    out += ALPHABET[v % ALPHABET.length];
  }
  return `GW-${out.slice(0, 4)}-${out.slice(4, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}`;
}
function hashCode(code) {
  const pepper = process.env.AUTH_SECRET || "";
  const normalized = code.toUpperCase().replace(/[^A-Z2-9]/g, "");
  return createHash("sha256").update(`${pepper}:${normalized}`).digest("hex");
}

// 초기화 (테스트 DB 한정)
await sql`TRUNCATE audit_log, sessions, pastoral_notes, pastoral_records, prayers,
  member_registrants, member_departments, user_assignments, app_users, members CASCADE`;

// ─── 가짜 성도 (지시서 4번 예시 구조 재현: A=인내조+청년부, B=사랑조+청년부, C=사랑조+장년부성격) ───
const FAKE_MEMBERS = [
  { key: "A",  name: "가성도", nanumjo: "인내조", departments: ["청년부(직장인)"] },
  { key: "B",  name: "나성도", nanumjo: "사랑조", departments: ["청년부(직장인)"] },
  { key: "C",  name: "다성도", nanumjo: "사랑조", departments: ["제1남전도회"] },
  { key: "D",  name: "라성도", nanumjo: "인내조", departments: ["제1여전도회"] },
  { key: "E",  name: "마성도", nanumjo: "희락조", departments: [] },
  { key: "F",  name: "바성도", nanumjo: null,      departments: ["중고등부 SFC"] }, // 부서장 미정 부서
  { key: "G",  name: "사성도", nanumjo: null,      departments: [] }, // 조·부서 미지정
  { key: "H",  name: "아성도", nanumjo: "인내조", departments: [] }, // 집사 사용자와 같은 조
  { key: "I",  name: "자성도", nanumjo: "충성조", departments: ["청년부(대학 SFC)"] },
  { key: "J",  name: "차성도", nanumjo: "온유조", departments: ["제1남전도회"] },
];

const memberIds = {};
for (const m of FAKE_MEMBERS) {
  const [row] = await sql`
    INSERT INTO members (name, nanumjo, member_status, phone, address, birth_date, gender)
    VALUES (${m.name}, ${m.nanumjo}, '활동', '010-0000-0000', '테스트시 테스트구 테스트로 1', '1990-01-01', '남')
    RETURNING id`;
  memberIds[m.key] = row.id;
  for (const d of m.departments) {
    await sql`INSERT INTO member_departments (member_id, department_name) VALUES (${row.id}, ${d})`;
  }
}

// ─── 가짜 사용자 (등급·담당 조합이 지시서 테스트 시나리오를 전부 커버) ────────────
const FAKE_USERS = [
  { key: "admin",        name: "관리자테스트",   grade: "집사",    isAdmin: true,  assigns: [["nanumjo","인내조"],["department","제1남전도회"]], memberKey: "J" },
  { key: "pastor",       name: "목사테스트",     grade: "목사",    isAdmin: false, assigns: [] },
  { key: "elder",        name: "장로테스트",     grade: "장로",    isAdmin: false, assigns: [] },
  { key: "elderLeader",  name: "장로조장테스트", grade: "장로",    isAdmin: false, assigns: [["nanumjo","희락조"]] },
  { key: "deacon",       name: "집사테스트",     grade: "집사",    isAdmin: false, assigns: [], memberKey: "H" }, // 리더 아님, 인내조 소속
  { key: "deaconLeader", name: "집사조장테스트", grade: "집사",    isAdmin: false, assigns: [["nanumjo","사랑조"]] },
  { key: "staff",        name: "행정테스트",     grade: "행정지원", isAdmin: false, assigns: [] },
  { key: "joLeader",     name: "무직조장테스트", grade: "없음",    isAdmin: false, assigns: [["nanumjo","인내조"]] },
  { key: "deptLeader",   name: "무직부서장테스트", grade: "없음",  isAdmin: false, assigns: [["department","청년부(직장인)"]] },
  { key: "dualLeader",   name: "겸임테스트",     grade: "없음",    isAdmin: false, assigns: [["nanumjo","인내조"],["department","청년부(직장인)"]] },
  { key: "nobody",       name: "무권한테스트",   grade: "없음",    isAdmin: false, assigns: [] },
  { key: "disabled",     name: "중지테스트",     grade: "집사",    isAdmin: false, assigns: [], disabled: true },
];

const codes = {};
const userIds = {};
for (const u of FAKE_USERS) {
  const code = generateCode();
  codes[u.key] = code;
  const [row] = await sql`
    INSERT INTO app_users (display_name, title, role_grade, is_admin, status, code_hash, code_issued_at, member_id)
    VALUES (${u.name}, ${u.grade === "없음" ? null : u.grade}, ${u.grade}, ${u.isAdmin},
            ${u.disabled ? "disabled" : "active"}, ${hashCode(code)}, now(),
            ${u.memberKey ? memberIds[u.memberKey] : null})
    RETURNING id`;
  userIds[u.key] = row.id;
  for (const [t, n] of u.assigns) {
    await sql`INSERT INTO user_assignments (user_id, unit_type, unit_name) VALUES (${row.id}, ${t}, ${n})`;
  }
}

// ─── 가짜 기도제목 ──────────────────────────────────────────────────────────
const addPrayer = (mk, content, authorKey) =>
  sql`INSERT INTO prayers (member_id, content, author_user_id)
      VALUES (${memberIds[mk]}, ${content}, ${authorKey ? userIds[authorKey] : null})`;
await addPrayer("A", "가성도 기도제목 (무직조장 작성)", "joLeader");
await addPrayer("A", "가성도 기도제목2 (부서장 작성)", "deptLeader");
await addPrayer("B", "나성도 기도제목 (집사조장 작성)", "deaconLeader");
await addPrayer("C", "다성도 기도제목 (작성자 미상)", null);
await addPrayer("E", "마성도 기도제목 (장로조장 작성)", "elderLeader");
await addPrayer("F", "바성도 기도제목 (관리자 작성 — 부서장 미정 부서)", "admin");
await addPrayer("G", "사성도 기도제목 (조부서 미지정)", "admin");
await addPrayer("H", "아성도 기도제목 (관리자 작성)", "admin");

// ─── 가짜 심방기록 ──────────────────────────────────────────────────────────
const [rec1] = await sql`
  INSERT INTO pastoral_records (member_id, visited_at, shared_content, author_user_id)
  VALUES (${memberIds.A}, '2026-09-01', '가성도 공유 심방기록 (목사 작성)', ${userIds.pastor}) RETURNING id`;
await sql`INSERT INTO pastoral_notes (record_id, author_user_id, content)
  VALUES (${rec1.id}, ${userIds.pastor}, '가성도 비공개 메모 (목사 작성)')`;

const [rec2] = await sql`
  INSERT INTO pastoral_records (member_id, visited_at, shared_content, author_user_id)
  VALUES (${memberIds.D}, '2026-09-10', '라성도 공유 심방기록 (집사 작성)', ${userIds.deacon}) RETURNING id`;
await sql`INSERT INTO pastoral_notes (record_id, author_user_id, content)
  VALUES (${rec2.id}, ${userIds.deacon}, '라성도 비공개 메모 (집사 작성)')`;

// 비공개 메모만 있는 기록 (공유 내용 없음) — 작성자·목사·관리자 외에는 존재도 안 보여야 함
const [rec3] = await sql`
  INSERT INTO pastoral_records (member_id, visited_at, shared_content, author_user_id)
  VALUES (${memberIds.E}, '2026-09-15', NULL, ${userIds.elder}) RETURNING id`;
await sql`INSERT INTO pastoral_notes (record_id, author_user_id, content)
  VALUES (${rec3.id}, ${userIds.elder}, '마성도 메모만 있는 기록 (장로 작성)')`;

// 등록자 기록: 다성도는 집사테스트가 등록한 것으로 (기본정보 수정 테스트용)
await sql`INSERT INTO member_registrants (member_id, created_by_user_id)
  VALUES (${memberIds.C}, ${userIds.deacon})`;

// 테스트 코드 저장 (git 제외 파일)
writeFileSync(
  "scripts/.test-codes.json",
  JSON.stringify({ codes, memberIds, userIds, recordIds: { rec1: rec1.id, rec2: rec2.id, rec3: rec3.id } }, null, 2),
);

const counts = await sql`SELECT
  (SELECT COUNT(*)::int FROM members) AS members,
  (SELECT COUNT(*)::int FROM app_users) AS users,
  (SELECT COUNT(*)::int FROM prayers) AS prayers,
  (SELECT COUNT(*)::int FROM pastoral_records) AS records`;
console.log("시드 완료:", JSON.stringify(counts[0]));
console.log("가짜 사용자 코드 → scripts/.test-codes.json (git 제외)");
await sql.end();
