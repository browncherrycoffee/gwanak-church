// 동기화 전파 검증 (테스트 서버 전용) — 삭제·심방 작성이 버전 신호를 깨우는지
// 사용법: BASE_URL=http://localhost:3100 node scripts/verify-sync-propagation.mjs
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const { codes, memberIds } = JSON.parse(readFileSync("scripts/.test-codes.json", "utf8"));

async function login(code) {
  const r = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const m = (r.headers.get("set-cookie") || "").match(/gwanak-session=([^;]+)/);
  if (!m) throw new Error("로그인 실패");
  return m[1];
}
const get = async (path, c) =>
  (await fetch(`${BASE}${path}`, { headers: { cookie: `gwanak-session=${c}` } })).json();
const ver = async (c) => (await get("/api/members/version", c))?.version;

const admin = await login(codes.admin);
const pastor = await login(codes.pastor);
const deacon = await login(codes.deacon);

let pass = 0, fail = 0;
const check = (name, ok) => { ok ? pass++ : fail++; console.log(`${ok ? "✅" : "❌"} ${name}`); };

// 1) 기도제목 삭제 → 버전 변화 (행 수 포함 덕분)
const prayers = await get("/api/prayers", admin);
const v1 = await ver(pastor);
await fetch(`${BASE}/api/prayers/${prayers.prayers[0].id}`, {
  method: "DELETE", headers: { cookie: `gwanak-session=${admin}` },
});
check("기도제목 삭제 → 다른 기기 변경 감지", v1 !== (await ver(pastor)));

// 2) 교인 삭제 → 버전 변화
const mems = await get("/api/members", admin);
const delTarget = mems.members.find((m) => m.name === "행정등록테스트") ?? mems.members[0];
const v3 = await ver(pastor);
await fetch(`${BASE}/api/members/${delTarget.id}`, {
  method: "DELETE", headers: { cookie: `gwanak-session=${admin}` },
});
check("교인 삭제 → 다른 기기 변경 감지", v3 !== (await ver(pastor)));

// 3) 심방기록 작성(집사) → 버전 변화 + 목사 즉시 조회
const v5 = await ver(pastor);
const addPast = await fetch(`${BASE}/api/pastoral`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie: `gwanak-session=${deacon}` },
  body: JSON.stringify({ memberId: memberIds.D, visitedAt: "2026-10-07", sharedContent: "동기화 검증 심방" }),
});
const v6 = await ver(pastor);
const pastList = await get("/api/pastoral", pastor);
check(`심방 작성(${addPast.status}) → 변경 감지`, addPast.status === 200 && v5 !== v6);
check("심방 작성 → 다른 사용자 즉시 조회", pastList.records.some((r) => r.sharedContent === "동기화 검증 심방"));

// 4) 기도제목 수정(작성자 본인) → 버전 변화
const mine = (await get("/api/prayers", admin)).prayers.find((p) => p.canEdit);
const v7 = await ver(pastor);
await fetch(`${BASE}/api/prayers/${mine.id}`, {
  method: "PATCH",
  headers: { "content-type": "application/json", cookie: `gwanak-session=${admin}` },
  body: JSON.stringify({ content: mine.content + " (수정됨)" }),
});
check("기도제목 수정 → 변경 감지", v7 !== (await ver(pastor)));

console.log(`\n전파 검증: ${pass}통과 / ${fail}실패`);
if (fail) process.exit(1);
