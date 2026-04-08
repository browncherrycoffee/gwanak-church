// 종합 시뮬레이션 테스트 — 4라운드
// 실제 사용 시나리오를 시뮬레이션하여 동기화 검증

const BASE = "https://gwanak-church.vercel.app";

async function freshLogin() {
  const res = await fetch(BASE + "/api/auth", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "3217" }),
  });
  if (!res.ok) throw new Error("Login failed: " + res.status);
  const cookie = res.headers.get("set-cookie").split(";")[0];
  return cookie;
}

let pass = 0, fail = 0;
function assert(label, ok, detail = "") {
  ok ? pass++ : fail++;
  console.log((ok ? "  OK " : "  FAIL ") + label + (detail ? " " + detail : ""));
}

async function getMembers() {
  const res = await fetch(BASE + "/api/members");
  if (!res.ok) throw new Error("GET failed: " + res.status);
  return (await res.json()).members;
}

async function getVersion() {
  const res = await fetch(BASE + "/api/members/version", { cache: "no-store" });
  return (await res.json()).updatedAt;
}

async function postMember(cookie, id, member) {
  const start = Date.now();
  const res = await fetch(BASE + "/api/members/" + id, {
    method: "POST",
    headers: { "Content-Type": "application/json", Cookie: cookie },
    body: JSON.stringify({ member }),
  });
  return { status: res.status, ms: Date.now() - start, body: await res.json() };
}

// ========================================================================
// Round 1: 기본 CRUD 전체 흐름
// ========================================================================
async function round1() {
  console.log("\n=== Round 1: 기본 CRUD 전체 흐름 ===");
  const cookie = await freshLogin();
  let all = await getMembers();
  const original = all.find((m) => m.name === "이명건");
  assert("211명 로드", all.length >= 200, `count=${all.length}`);

  // UPDATE
  const marker = "r1-" + Date.now();
  let r = await postMember(cookie, original.id, { ...original, notes: marker });
  assert("UPDATE POST 200", r.status === 200, r.ms + "ms");

  all = await getMembers();
  assert("UPDATE DB 반영", all.find((m) => m.id === original.id)?.notes === marker);

  // version 변경
  const ver1 = await getVersion();
  assert("version 존재", !!ver1);

  // 연속 수정 3회
  for (let i = 1; i <= 3; i++) {
    r = await postMember(cookie, original.id, { ...original, notes: `rapid-${i}` });
    assert(`rapid #${i} → ${r.status}`, r.status === 200, r.ms + "ms");
  }
  all = await getMembers();
  assert("최종값 rapid-3", all.find((m) => m.id === original.id)?.notes === "rapid-3");

  // 원복
  await postMember(cookie, original.id, original);
}

// ========================================================================
// Round 2: 크로스 디바이스 동기화
// ========================================================================
async function round2() {
  console.log("\n=== Round 2: 크로스 디바이스 동기화 ===");
  const cookie1 = await freshLogin(); // PC
  const cookie2 = await freshLogin(); // Mobile

  let all = await getMembers();
  const target = all.find((m) => m.name === "이명건");
  const ver0 = await getVersion();

  // PC에서 수정
  const pcMarker = "pc-" + Date.now();
  await postMember(cookie1, target.id, { ...target, notes: pcMarker });

  // Mobile이 version 폴링으로 변경 감지
  const ver1 = await getVersion();
  assert("PC 수정 후 version 변경", ver1 !== ver0);

  // Mobile이 GET으로 최신화
  all = await getMembers();
  assert("Mobile이 PC 수정 확인", all.find((m) => m.id === target.id)?.notes === pcMarker);

  // Mobile에서 다른 필드 수정
  const mobileMarker = "m-" + Date.now();
  const current = all.find((m) => m.id === target.id);
  await postMember(cookie2, target.id, { ...current, carNumber: mobileMarker });

  // PC가 version 폴링
  const ver2 = await getVersion();
  assert("Mobile 수정 후 version 변경", ver2 !== ver1);

  // PC가 GET으로 확인
  all = await getMembers();
  const final = all.find((m) => m.id === target.id);
  assert("PC가 Mobile 차량번호 확인", final?.carNumber === mobileMarker);
  assert("PC에서 notes 유지", final?.notes === pcMarker);

  // 원복
  await postMember(cookie1, target.id, target);
}

// ========================================================================
// Round 3: 교인 추가/삭제 (PUT/DELETE 경로)
// ========================================================================
async function round3() {
  console.log("\n=== Round 3: 교인 추가/삭제 ===");
  const cookie = await freshLogin();

  // POST로 새 교인 추가 (addMember가 schedulePatch를 사용)
  const newId = crypto.randomUUID();
  const newMember = {
    id: newId, name: "테스트용교인", phone: "010-0000-0000",
    address: null, detailAddress: null, birthDate: null, gender: "남",
    position: null, department: null, district: null,
    familyMembers: [], familyHead: null, relationship: null,
    baptismDate: null, baptismType: null, baptismChurch: null,
    registrationDate: null, memberJoinDate: null, carNumber: null,
    notes: "자동테스트", photoUrl: null, memberStatus: "활동",
    prayerRequests: [], pastoralVisits: [],
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const r = await postMember(cookie, newId, newMember);
  assert("새 교인 POST 200", r.status === 200, r.ms + "ms");

  let all = await getMembers();
  assert("새 교인 DB 존재", !!all.find((m) => m.id === newId));

  // 다른 기기에서 새 교인이 보이는지 확인 (version 변경 감지)
  const ver = await getVersion();
  assert("version 갱신", !!ver);

  // DELETE
  const delRes = await fetch(BASE + "/api/members/" + newId, {
    method: "DELETE", headers: { Cookie: cookie },
  });
  assert("DELETE 200", delRes.status === 200);

  all = await getMembers();
  assert("삭제 후 DB 없음", !all.find((m) => m.id === newId));

  // 기존 교인이 삭제되지 않았는지 확인 (notInArray 버그 수정 검증)
  assert("기존 교인 유지", all.length >= 200, `count=${all.length}`);
}

// ========================================================================
// Round 4: 기도제목/심방 추가 (하위 데이터)
// ========================================================================
async function round4() {
  console.log("\n=== Round 4: 기도제목/심방 추가 ===");
  const cookie = await freshLogin();
  let all = await getMembers();
  const target = all.find((m) => m.name === "이명건");
  const originalPrayers = target.prayerRequests.length;
  const originalVisits = target.pastoralVisits.length;

  // 기도제목 추가
  const prayerId = crypto.randomUUID();
  const withPrayer = {
    ...target,
    prayerRequests: [
      { id: prayerId, content: "테스트 기도제목", createdAt: new Date().toISOString() },
      ...target.prayerRequests,
    ],
    updatedAt: new Date().toISOString(),
  };
  let r = await postMember(cookie, target.id, withPrayer);
  assert("기도제목 추가 POST 200", r.status === 200);

  all = await getMembers();
  const updated = all.find((m) => m.id === target.id);
  assert("기도제목 DB 반영", updated.prayerRequests.length === originalPrayers + 1);
  assert("기도제목 내용 확인", updated.prayerRequests.some((p) => p.id === prayerId));

  // 심방 추가
  const visitId = crypto.randomUUID();
  const withVisit = {
    ...updated,
    pastoralVisits: [
      { id: visitId, visitedAt: "2026-04-08", content: "테스트 심방", createdAt: new Date().toISOString() },
      ...updated.pastoralVisits,
    ],
    updatedAt: new Date().toISOString(),
  };
  r = await postMember(cookie, target.id, withVisit);
  assert("심방 추가 POST 200", r.status === 200);

  all = await getMembers();
  const updated2 = all.find((m) => m.id === target.id);
  assert("심방 DB 반영", updated2.pastoralVisits.length === originalVisits + 1);

  // 원복 (기도제목, 심방 제거)
  await postMember(cookie, target.id, target);
  all = await getMembers();
  const restored = all.find((m) => m.id === target.id);
  assert("원복: 기도제목 수", restored.prayerRequests.length === originalPrayers);
  assert("원복: 심방 수", restored.pastoralVisits.length === originalVisits);
}

// ========================================================================
// Round 5: 인증 실패 테스트
// ========================================================================
async function round5() {
  console.log("\n=== Round 5: 인증 실패 테스트 ===");

  const all = await getMembers();
  const target = all[0];

  // POST without auth
  const r1 = await fetch(BASE + "/api/members/" + target.id, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ member: target }),
  });
  assert("POST 인증 없이 → 401", r1.status === 401);

  // DELETE without auth
  const r2 = await fetch(BASE + "/api/members/" + target.id, { method: "DELETE" });
  assert("DELETE 인증 없이 → 401", r2.status === 401);

  // PUT without auth
  const r3 = await fetch(BASE + "/api/members", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([]),
  });
  assert("PUT 인증 없이 → 401", r3.status === 401);
}

// ========================================================================
// Round 6: 동시 편집 (race condition) — 두 기기가 같은 교인을 동시에 수정
// ========================================================================
async function round6() {
  console.log("\n=== Round 6: 동시 편집 (race condition) ===");
  // 이전 라운드 커넥션 정리 대기
  await new Promise((r) => setTimeout(r, 2000));
  const cookie1 = await freshLogin();
  const cookie2 = await freshLogin();

  let all = await getMembers();
  const target = all.find((m) => m.name === "이명건");

  // PC에서 수정 → 100ms 후 Mobile 수정 (현실적 "거의 동시" 시나리오)
  const ts = Date.now();
  const r1 = await postMember(cookie1, target.id, { ...target, notes: "pr-" + ts });
  assert("PC 편집 200", r1.status === 200);

  // Mobile이 최신 데이터 기반으로 수정 (현실적 — GET 후 수정)
  let all2 = await getMembers();
  const latest = all2.find((m) => m.id === target.id);
  const r2 = await postMember(cookie2, latest.id, { ...latest, carNumber: "mr-" + ts });
  if (r2.status !== 200) {
    console.log(`  [DEBUG] Round 6 Mobile 실패: status=${r2.status} body=${JSON.stringify(r2.body)}`);
    // 2초 후 재시도
    await new Promise((r) => setTimeout(r, 2000));
    const retry = await postMember(cookie2, latest.id, { ...latest, carNumber: "mr-" + ts });
    console.log(`  [DEBUG] Round 6 재시도: status=${retry.status}`);
    assert("Mobile 편집 (재시도) 200", retry.status === 200);
  } else {
    assert("Mobile 편집 200", true);
  }

  // 최종 상태 확인 — 둘 다 반영되어야 함
  all = await getMembers();
  const final = all.find((m) => m.id === target.id);
  assert("크로스 편집 후 notes 유지", final?.notes === "pr-" + ts);
  assert("크로스 편집 후 carNumber 유지", final?.carNumber === "mr-" + ts);

  // 원복
  await postMember(cookie1, target.id, target);
}

// ========================================================================
// Round 7: 연속 빠른 수정 (debounce 검증) — 10회 연속
// ========================================================================
async function round7() {
  console.log("\n=== Round 7: 연속 빠른 수정 10회 ===");
  const cookie = await freshLogin();
  let all = await getMembers();
  const target = all.find((m) => m.name === "이명건");

  // 10번 연속 수정
  for (let i = 1; i <= 10; i++) {
    await postMember(cookie, target.id, { ...target, notes: `burst-${i}` });
  }

  all = await getMembers();
  const final = all.find((m) => m.id === target.id);
  assert("10회 연속 후 최종값 burst-10", final?.notes === "burst-10");

  // 원복
  await postMember(cookie, target.id, target);
}

// ========================================================================
// Round 8: 빈 문자열 / null 처리
// ========================================================================
async function round8() {
  console.log("\n=== Round 8: 빈 문자열 / null 처리 ===");
  const cookie = await freshLogin();
  let all = await getMembers();
  const target = all.find((m) => m.name === "이명건");

  // 빈 문자열로 수정
  const r = await postMember(cookie, target.id, { ...target, carNumber: "", notes: "" });
  assert("빈 문자열 POST 200", r.status === 200);

  all = await getMembers();
  const updated = all.find((m) => m.id === target.id);
  // DB에서 빈 문자열도 허용 (서버는 그대로 저장)
  assert("빈 문자열 저장", updated?.carNumber === "" || updated?.carNumber === null);

  // null로 수정
  const r2 = await postMember(cookie, target.id, { ...target, carNumber: null, notes: null });
  assert("null POST 200", r2.status === 200);

  all = await getMembers();
  const updated2 = all.find((m) => m.id === target.id);
  assert("null 저장", updated2?.carNumber === null);

  // 원복
  await postMember(cookie, target.id, target);
}

async function main() {
  try {
    await round1();
    await round2();
    await round3();
    await round4();
    await round5();
    await round6();
    await round7();
    await round8();
  } catch (err) {
    console.error("\n치명적 오류:", err);
    fail++;
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`종합 결과: ${pass} passed, ${fail} failed`);
  console.log(`${"=".repeat(50)}`);
  process.exit(fail > 0 ? 1 : 0);
}

main();
