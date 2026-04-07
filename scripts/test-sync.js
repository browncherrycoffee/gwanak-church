// 동기화 로직 통합 테스트 — 프로덕션 API 대상
// 시나리오 A: PUT → DB 반영 확인 (GET으로 검증)
// 시나리오 B: PUT → version 변경 감지 확인
// 시나리오 C: 연속 PUT → 데이터 일관성 확인

const BASE = "https://gwanak-church.vercel.app";
const AUTH_COOKIE = process.env.AUTH_COOKIE;

if (!AUTH_COOKIE) {
  console.error("AUTH_COOKIE 환경변수 필요 (gwanak-auth=xxx 형태)");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Cookie: AUTH_COOKIE,
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { ...headers, ...opts.headers } });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = null; }
  return { status: res.status, json, text };
}

let allMembers = [];
let testPassed = 0;
let testFailed = 0;

function assert(label, condition, detail = "") {
  if (condition) {
    console.log(`  ✓ ${label}`);
    testPassed++;
  } else {
    console.error(`  ✗ ${label} ${detail}`);
    testFailed++;
  }
}

async function setup() {
  console.log("=== Setup: GET 현재 데이터 ===");
  const { status, json } = await fetchJSON(`${BASE}/api/members`);
  assert("GET /api/members 200", status === 200);
  assert("members 배열 존재", json?.members?.length > 0, `count=${json?.members?.length}`);
  allMembers = json.members;
  console.log(`  총 ${allMembers.length}명 로드됨`);
}

async function scenarioA() {
  console.log("\n=== 시나리오 A: PUT → DB 반영 확인 ===");
  // 임의 교인 1명의 notes를 변경 후 PUT, GET으로 확인
  const target = allMembers.find((m) => m.name === "이명건");
  if (!target) { console.log("  이명건 없음 — skip"); return; }

  const marker = `test-sync-${Date.now()}`;
  const original = target.notes;
  target.notes = marker;

  const { status, json } = await fetchJSON(`${BASE}/api/members`, {
    method: "PUT",
    body: JSON.stringify(allMembers),
  });
  assert("PUT 200", status === 200);
  assert("PUT ok=true", json?.ok === true);
  assert("PUT updatedAt 존재", !!json?.updatedAt, `updatedAt=${json?.updatedAt}`);

  // GET으로 확인
  const { json: getJson } = await fetchJSON(`${BASE}/api/members`);
  const found = getJson?.members?.find((m) => m.id === target.id);
  assert("GET 반영 확인", found?.notes === marker, `expected=${marker}, got=${found?.notes}`);

  // 원복
  target.notes = original;
  await fetchJSON(`${BASE}/api/members`, { method: "PUT", body: JSON.stringify(allMembers) });
  console.log("  원복 완료");
}

async function scenarioB() {
  console.log("\n=== 시나리오 B: PUT → version 변경 감지 ===");
  // 버전 체크
  const { json: v1 } = await fetchJSON(`${BASE}/api/members/version`);
  const ver1 = v1?.updatedAt;
  assert("version 초기값 존재", !!ver1, `ver=${ver1}`);

  // 아무 교인의 updatedAt만 변경하여 PUT
  const target = allMembers[0];
  const origUpdatedAt = target.updatedAt;
  target.updatedAt = new Date().toISOString();

  await fetchJSON(`${BASE}/api/members`, { method: "PUT", body: JSON.stringify(allMembers) });

  // 잠시 대기 후 버전 재확인
  await new Promise((r) => setTimeout(r, 500));
  const { json: v2 } = await fetchJSON(`${BASE}/api/members/version`);
  const ver2 = v2?.updatedAt;
  assert("version 변경됨", ver2 !== ver1, `before=${ver1}, after=${ver2}`);

  // 원복
  target.updatedAt = origUpdatedAt;
  await fetchJSON(`${BASE}/api/members`, { method: "PUT", body: JSON.stringify(allMembers) });
}

async function scenarioC() {
  console.log("\n=== 시나리오 C: 연속 PUT → 데이터 일관성 ===");
  // 3번 연속 PUT (다른 notes)으로 최종 값이 유지되는지 확인
  const target = allMembers.find((m) => m.name === "이명건") || allMembers[0];
  const original = target.notes;

  for (let i = 1; i <= 3; i++) {
    target.notes = `consistency-test-${i}`;
    const { status } = await fetchJSON(`${BASE}/api/members`, {
      method: "PUT",
      body: JSON.stringify(allMembers),
    });
    assert(`PUT #${i} → 200`, status === 200);
  }

  const { json } = await fetchJSON(`${BASE}/api/members`);
  const found = json?.members?.find((m) => m.id === target.id);
  assert("최종값 일관성", found?.notes === "consistency-test-3", `got=${found?.notes}`);

  // 원복
  target.notes = original;
  await fetchJSON(`${BASE}/api/members`, { method: "PUT", body: JSON.stringify(allMembers) });
  console.log("  원복 완료");
}

async function scenarioD() {
  console.log("\n=== 시나리오 D: 인증 없이 PUT → 401 ===");
  const { status } = await fetch(`${BASE}/api/members`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([]),
  });
  assert("인증 없는 PUT → 401", status === 401, `got=${status}`);
}

async function main() {
  try {
    await setup();
    await scenarioA();
    await scenarioB();
    await scenarioC();
    await scenarioD();
  } catch (err) {
    console.error("\n테스트 실행 중 오류:", err);
    testFailed++;
  }

  console.log(`\n=== 결과: ${testPassed} passed, ${testFailed} failed ===`);
  process.exit(testFailed > 0 ? 1 : 0);
}

main();
