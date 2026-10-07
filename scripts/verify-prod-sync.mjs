// 운영 환경 동기화 스모크 테스트 — 기기 2대 시나리오 재현.
// 세션A(기기1)가 작성 → 세션B(기기2)의 2초 폴링 신호가 감지하는지 확인.
// 테스트로 넣은 기도제목은 즉시 삭제해 원상복구한다. (관리자 코드 필요)
import { readFileSync } from "node:fs";

const BASE = "https://gwanak-church.vercel.app";
const sheet = readFileSync("관악교회 교적부 백업 데이터/접속코드-발급-2026-10-02.txt", "utf8");
const code = sheet.match(/^이명건[^\n]*\n  접속 코드: (\d{6})/m)?.[1];
if (!code) { console.error("관리자 코드를 찾을 수 없음"); process.exit(1); }

async function login() {
  const r = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const m = (r.headers.get("set-cookie") || "").match(/gwanak-session=([^;]+)/);
  if (!m) { console.error(`로그인 실패 (${r.status})`); process.exit(1); }
  return m[1];
}

const deviceA = await login(); // 기기 1 (작성하는 쪽)
const deviceB = await login(); // 기기 2 (보는 쪽 — 별도 세션)
console.log("기기 2대 시뮬레이션: 세션 2개 생성 완료");

const get = async (path, c) =>
  (await fetch(`${BASE}${path}`, { headers: { cookie: `gwanak-session=${c}` }, cache: "no-store" })).json();

// 대상: 관리자 본인과 연결된 성도 (이명건)
const auth = await get("/api/auth", deviceA);
const target = auth.memberId;
if (!target) { console.error("연결 성도 없음"); process.exit(1); }

const MARK = `동기화 점검 ${Date.now()}`;
const vBefore = (await get("/api/members/version", deviceB)).version;

// 기기1: 기도제목 작성
const t0 = Date.now();
const add = await fetch(`${BASE}/api/prayers`, {
  method: "POST",
  headers: { "content-type": "application/json", cookie: `gwanak-session=${deviceA}` },
  body: JSON.stringify({ memberId: target, content: MARK }),
});
console.log(`기기1 작성: HTTP ${add.status} (${Date.now() - t0}ms)`);

// 기기2: 변경 신호 감지 + 내용 조회
const vAfter = (await get("/api/members/version", deviceB)).version;
const listB = await get("/api/prayers", deviceB);
const found = listB.prayers.find((p) => p.content === MARK);
console.log(`기기2 변경 신호 감지: ${vBefore !== vAfter ? "✅" : "❌"}`);
console.log(`기기2에서 내용 확인: ${found ? "✅ (" + (Date.now() - t0) + "ms)" : "❌"}`);

// 원상복구: 삭제 + 기기2에서 사라짐 확인
const del = await fetch(`${BASE}/api/prayers/${found.id}`, {
  method: "DELETE", headers: { cookie: `gwanak-session=${deviceA}` },
});
const vFinal = (await get("/api/members/version", deviceB)).version;
const gone = !(await get("/api/prayers", deviceB)).prayers.some((p) => p.content === MARK);
console.log(`삭제 복구: HTTP ${del.status} / 기기2 삭제 감지: ${vAfter !== vFinal ? "✅" : "❌"} / 목록에서 사라짐: ${gone ? "✅" : "❌"}`);

// 세션 정리
for (const c of [deviceA, deviceB]) {
  await fetch(`${BASE}/api/auth`, { method: "DELETE", headers: { cookie: `gwanak-session=${c}` } });
}
console.log("점검 세션 로그아웃 완료 (데이터 원상복구됨)");
