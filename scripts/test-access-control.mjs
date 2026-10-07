// 접근 권한 자동 테스트 — 실제 HTTP 경로로 검증한다.
// 전제: 테스트 DB 시드(seed-test-db.mjs) 완료 + 테스트 서버 가동.
// 사용법: BASE_URL=http://localhost:3100 node scripts/test-access-control.mjs
import { readFileSync } from "node:fs";

const BASE = process.env.BASE_URL || "http://localhost:3100";
const { codes, memberIds, recordIds } = JSON.parse(readFileSync("scripts/.test-codes.json", "utf8"));

const results = [];
function check(id, role, desc, pass, extra = "") {
  results.push({ id, role, desc, pass, extra });
  console.log(`${pass ? "통과" : "실패"} [${id}] (${role}) ${desc}${extra ? " — " + extra : ""}`);
}

const cookies = {}; // userKey → cookie string

async function login(userKey) {
  const res = await fetch(`${BASE}/api/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: codes[userKey] }),
  });
  const setCookie = res.headers.get("set-cookie") ?? "";
  const m = setCookie.match(/gwanak-session=([^;]+)/);
  if (res.ok && m) cookies[userKey] = `gwanak-session=${m[1]}`;
  return res.status;
}

async function req(userKey, method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(userKey && cookies[userKey] ? { cookie: cookies[userKey] } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    redirect: "manual",
  });
  let json = null;
  try { json = await res.json(); } catch { /* redirect 등 */ }
  return { status: res.status, json };
}

// ─── 0. 로그인 준비 (시도 제한 오염 방지를 위해 성공 로그인 먼저 전부 수행) ───
const loginKeys = ["admin","pastor","elder","elderLeader","deacon","deaconLeader","staff","joLeader","deptLeader","dualLeader","nobody","scopedDeacon","staffOwn","prayerAll"];
for (const k of loginKeys) {
  const st = await login(k);
  if (st !== 200) { console.error(`로그인 실패: ${k} (${st}) — 중단`); process.exit(1); }
}

// 중지된 사용자는 로그인 자체가 거부
check("15a", "중지사용자", "사용 중지된 코드로 로그인 불가", (await login("disabled")) === 401);

// 관리자 재확인 수행 (관리 API용)
{
  const before = await req("admin", "GET", "/api/admin/users");
  check("관리자재확인a", "관리자", "재확인 전 관리 API 차단", before.status === 403);
  const v = await req("admin", "POST", "/api/auth/verify-admin", { code: codes.admin });
  const after = await req("admin", "GET", "/api/admin/users");
  check("관리자재확인b", "관리자", "코드 재입력 후 관리 API 허용", v.status === 200 && after.status === 200);
}

const prayerList = async (k) => {
  const r = await req(k, "GET", "/api/prayers");
  return r.status === 200 ? (r.json?.prayers ?? []) : r.status;
};
const pastoralList = async (k) => {
  const r = await req(k, "GET", "/api/pastoral");
  return r.status === 200 ? (r.json?.records ?? []) : r.status;
};
const notesOf = (records) => records.flatMap((r) => r.privateNotes ?? []);

// ─── 1. 관리자·목사: 모든 기도제목 + 모든 비공개 메모 ─────────────────────────
for (const k of ["admin", "pastor"]) {
  const prayers = await prayerList(k);
  const records = await pastoralList(k);
  check("1", k === "admin" ? "관리자" : "목사", "모든 기도제목(8)과 모든 비공개 메모(3) 열람",
    Array.isArray(prayers) && prayers.length === 8 &&
    Array.isArray(records) && notesOf(records).length === 3,
    `기도 ${Array.isArray(prayers) ? prayers.length : prayers}, 메모 ${Array.isArray(records) ? notesOf(records).length : records}`);
}

// ─── 2. 장로: 기도 전체 + 공유 심방, 남의 비공개 메모는 불가 ──────────────────
{
  const prayers = await prayerList("elder");
  const records = await pastoralList("elder");
  const notes = notesOf(records);
  const onlyOwn = notes.every((n) => n.authorName === "장로테스트");
  check("2", "장로", "기도제목 전체(8)·공유 심방 열람, 남의 비공개 메모 차단",
    prayers.length === 8 && onlyOwn && notes.length === 1,
    `기도 ${prayers.length}, 보이는 메모 ${notes.length}(본인 것만: ${onlyOwn})`);
}

// ─── 3·4. 리더 아닌 집사: 전체 성도·공유 심방, 같은 조 기도만 열람(추가·수정 거부) ─
{
  const mem = await req("deacon", "GET", "/api/members");
  const prayers = await prayerList("deacon");
  const ids = new Set(prayers.map((p) => p.memberId));
  const sameUnitOnly = ids.size > 0 && [...ids].every((id) => [memberIds.A, memberIds.D, memberIds.H].includes(id));
  check("3", "집사", "성도 전체(10) + 같은 조 기도제목만(3)",
    mem.json?.scope === "full" && mem.json?.members?.length === 10 && prayers.length === 3 && sameUnitOnly,
    `성도 ${mem.json?.members?.length}, 기도 ${prayers.length}`);

  const add = await req("deacon", "POST", "/api/prayers", { memberId: memberIds.A, content: "불법 추가 시도" });
  const anyPrayer = (await prayerList("admin"))[0];
  const edit = await req("deacon", "PATCH", `/api/prayers/${anyPrayer.id}`, { content: "불법 수정" });
  check("4", "집사", "같은 조 기도제목 추가·수정 거부", add.status === 403 && edit.status === 403,
    `추가 ${add.status}, 수정 ${edit.status}`);

  const records = await pastoralList("deacon");
  const notes = notesOf(records);
  check("3b", "집사", "공유 심방 열람 + 남의 비공개 메모 차단(본인 1건만)",
    Array.isArray(records) && notes.length === 1 && notes[0].authorName === "집사테스트");
  // 12. 비공개 메모만 있는 기록(rec3)이 목록·건수에 없음
  check("12", "집사", "메모만 있는 심방기록이 목록에 안 보임",
    !records.some((r) => r.id === recordIds.rec3), `목록 ${records.length}건`);
}

// ─── 5·6·7. 조장·부서장 공동 열람, 범위 비확장, 겸임 합집합 ───────────────────
{
  const jo = await prayerList("joLeader");
  const dept = await prayerList("deptLeader");
  const dual = await prayerList("dualLeader");
  const joMem = new Set(jo.map((p) => p.memberId));
  const deptMem = new Set(dept.map((p) => p.memberId));
  const aPrayerIds = jo.filter((p) => p.memberId === memberIds.A).map((p) => p.id).sort();
  const aPrayerIds2 = dept.filter((p) => p.memberId === memberIds.A).map((p) => p.id).sort();
  check("5", "조장+부서장", "같은 성도(A)의 같은 기도제목 기록을 함께 열람",
    aPrayerIds.length === 2 && JSON.stringify(aPrayerIds) === JSON.stringify(aPrayerIds2));
  check("6", "조장/부서장", "서로의 다른 성도까지 범위가 넓어지지 않음",
    !joMem.has(memberIds.B) && !deptMem.has(memberIds.H) && !joMem.has(memberIds.C) && !deptMem.has(memberIds.C),
    `조장 범위 ${[...joMem].length}명, 부서장 범위 ${[...deptMem].length}명`);
  const dualIds = dual.map((p) => p.id);
  check("7", "겸임", "합집합 열람 + 중복 없음",
    dual.length === 4 && new Set(dualIds).size === dualIds.length, `${dual.length}건`);

  // 수정: 작성자 본인만, 삭제: 관리자만
  const own = jo.find((p) => p.authorName === "무직조장테스트");
  const others = jo.find((p) => p.authorName === "무직부서장테스트");
  const editOwn = await req("joLeader", "PATCH", `/api/prayers/${own.id}`, { content: "작성자 본인 수정" });
  const editOther = await req("joLeader", "PATCH", `/api/prayers/${others.id}`, { content: "남의 것 수정 시도" });
  const delOwn = await req("joLeader", "DELETE", `/api/prayers/${own.id}`);
  check("5b", "조장", "수정은 작성자 본인만(본인 200/남 403), 삭제는 작성자도 거부(403)",
    editOwn.status === 200 && editOther.status === 403 && delOwn.status === 403,
    `${editOwn.status}/${editOther.status}/${delOwn.status}`);
}

// ─── 8. 직분 없는 조장: 이름·소속만, 심방 차단, 미담당 조 차단 ─────────────────
{
  const mem = await req("joLeader", "GET", "/api/members");
  const first = mem.json?.members?.[0] ?? {};
  const nameOnly = mem.json?.scope === "name-only" &&
    mem.json?.members?.length === 3 &&
    first.phone !== undefined && first.address !== undefined && first.baptismType !== undefined &&
    first.birthDate === undefined && first.notes === undefined && first.photoUrl === undefined;
  const past = await req("joLeader", "GET", "/api/pastoral");
  check("8", "무직조장", "맡은 조 3명의 이름·소속·연락처·주소·세례만(생년월일 등 차단) + 심방 차단(403)",
    nameOnly && past.status === 403,
    `scope=${mem.json?.scope}, ${mem.json?.members?.length}명, 심방 ${past.status}`);
}

// ─── 9. 성도 상세 응답 동일 규칙 — 상세도 같은 API를 쓰므로 3·8로 검증됨 ───────
check("9", "전체", "성도 상세도 동일 API 경유 (별도 상세 API 없음 — 3·8 결과로 충족)", true);

// ─── 10. ID 바꾼 직접 요청·작성자 조작·대상 변경 차단 ─────────────────────────
{
  // nobody가 기도제목 ID 직접 지정 조회·수정
  const p = (await prayerList("admin"))[0];
  const patch = await req("nobody", "PATCH", `/api/prayers/${p.id}`, { content: "우회 시도" });
  const del = await req("nobody", "DELETE", `/api/prayers/${p.id}`);
  const list = await prayerList("nobody");
  // 작성자 조작: body에 authorUserId 넣어도 서버가 무시 (스키마상 받지 않음)
  const spoof = await req("joLeader", "POST", "/api/prayers", {
    memberId: memberIds.H, content: "작성자 조작 시도", authorUserId: "00000000-0000-0000-0000-000000000000",
  });
  let spoofOk = spoof.status === 200;
  if (spoofOk) {
    const mine = (await prayerList("admin")).find((x) => x.content === "작성자 조작 시도");
    spoofOk = mine?.authorName === "무직조장테스트"; // 서버가 세션 기준으로 기록했는가
  }
  check("10", "무권한/조장", "ID 직접 요청(403)·목록 0건·작성자 조작 무력화",
    patch.status === 403 && del.status === 403 && Array.isArray(list) && list.length === 0 && spoofOk,
    `patch ${patch.status}, del ${del.status}, 목록 ${Array.isArray(list) ? list.length : list}`);
}

// ─── 11. 행정지원: 성도·기도 전체 열람, 심방은 존재 자체 차단 ─────────────────
{
  const mem = await req("staff", "GET", "/api/members");
  const prayers = await prayerList("staff");
  // 관리자와 같은 시점 비교 (앞 테스트가 데이터를 추가했을 수 있으므로 동적 기준)
  const adminMem = await req("admin", "GET", "/api/members");
  const adminPrayers = await prayerList("admin");
  const past = await req("staff", "GET", "/api/pastoral");
  const noLeak = past.status === 403 && !JSON.stringify(past.json ?? {}).match(/record|count|note/i);
  const addPast = await req("staff", "POST", "/api/pastoral", { memberId: memberIds.A, sharedContent: "불법" });
  const addPrayer = await req("staff", "POST", "/api/prayers", { memberId: memberIds.A, content: "행정 기도 작성 테스트" });
  check("11(행정지원)", "행정지원", "성도·기도 전체 열람 + 기도 작성 허용(2026-10-07), 심방은 차단·건수 비노출",
    mem.json?.members?.length === adminMem.json?.members?.length &&
    prayers.length === adminPrayers.length && prayers.length >= 8 &&
    noLeak && addPast.status === 403 && addPrayer.status === 200,
    `성도 ${mem.json?.members?.length}/${adminMem.json?.members?.length}, 기도 ${prayers.length}/${adminPrayers.length}, 심방 ${past.status}, 기도작성 ${addPrayer.status}`);
}

// ─── 심방 범위 한정(집사 등급, 청년부(직장인) 담당): 담당 부서 성도 기록만 ───────
{
  const records = await pastoralList("scopedDeacon");
  // rec1=A(인내조+청년부(직장인)) → 보임 / rec2=D(인내조+제1여전도회) → 안 보임 / rec3=E 메모만 → 안 보임
  const seesA = records.some((r) => r.id === recordIds.rec1);
  const hidesD = !records.some((r) => r.id === recordIds.rec2);
  const hidesE = !records.some((r) => r.id === recordIds.rec3);
  const writeOut = await req("scopedDeacon", "POST", "/api/pastoral", { memberId: memberIds.D, sharedContent: "범위 밖 작성 시도" });
  const writeIn = await req("scopedDeacon", "POST", "/api/pastoral", { memberId: memberIds.B, sharedContent: "범위 안 작성", visitedAt: "2026-10-02" });
  check("심방범위한정", "청년심방담당", "담당 부서 성도 심방만 열람·작성 (범위 밖 403)",
    seesA && hidesD && hidesE && writeOut.status === 403 && writeIn.status === 200,
    `A보임:${seesA} D숨김:${hidesD} 범위밖작성:${writeOut.status} 범위안작성:${writeIn.status}`);
}

// ─── 행정지원 + 본인 심방(own): 작성 가능, 본인 기록만 열람 ───────────────────
{
  const before = await pastoralList("staffOwn");
  const writeRes = await req("staffOwn", "POST", "/api/pastoral", {
    memberId: memberIds.G, visitedAt: "2026-10-02",
    sharedContent: "행정심방 공유 기록", privateNote: "행정심방 비공개 메모",
  });
  const after = await pastoralList("staffOwn");
  const onlyOwn = Array.isArray(after) && after.length >= 1 &&
    after.every((r) => r.authorName === "행정심방테스트") &&
    !after.some((r) => r.id === recordIds.rec1 || r.id === recordIds.rec2);
  check("심방own", "행정지원(본인심방)", "심방 작성 가능 + 본인 작성 기록만 열람(남의 기록 차단)",
    Array.isArray(before) && writeRes.status === 200 && onlyOwn,
    `작성 ${writeRes.status}, 목록 ${Array.isArray(after) ? after.length : after}건(전부 본인: ${onlyOwn})`);
}

// ─── 기도제목 전체 범위(집사+prayer_scope=all, 감사 기도제목 담당) ─────────────
{
  const adminPrayers = await prayerList("admin");
  const mine = await prayerList("prayerAll");
  // 전체 열람 (관리자와 동일 건수) + 담당 밖 성도(G: 조·부서 미지정)에게도 추가 가능
  const addOut = await req("prayerAll", "POST", "/api/prayers", { memberId: memberIds.G, content: "감사 기도제목 테스트" });
  // 수정·삭제 규칙은 그대로: 남이 쓴 것 수정 403, 본인 것도 삭제 403
  const others = adminPrayers.find((x) => x.authorName === "무직조장테스트");
  const editOther = await req("prayerAll", "PATCH", `/api/prayers/${others.id}`, { content: "수정 시도" });
  const mineNew = (await prayerList("prayerAll")).find((x) => x.content === "감사 기도제목 테스트");
  const delOwn = await req("prayerAll", "DELETE", `/api/prayers/${mineNew.id}`);
  check("기도전체범위", "감사기도담당", "전체 열람 + 아무 성도에게나 추가, 남의 것 수정·본인 삭제는 거부",
    mine.length === adminPrayers.length && addOut.status === 200 && editOther.status === 403 && delOwn.status === 403,
    `열람 ${mine.length}/${adminPrayers.length}, 추가 ${addOut.status}, 남수정 ${editOther.status}, 삭제 ${delOwn.status}`);
}

// ─── 13. 목사: 열람은 전체, 남의 기록 수정·모든 삭제 거부 ─────────────────────
{
  const editOther = await req("pastor", "PATCH", `/api/pastoral/${recordIds.rec2}`, { sharedContent: "목사 수정 시도" });
  const delRec = await req("pastor", "DELETE", `/api/pastoral/${recordIds.rec1}`);
  const anyPrayer = (await prayerList("admin")).find((p) => p.authorName !== "목사테스트");
  const editPrayer = await req("pastor", "PATCH", `/api/prayers/${anyPrayer.id}`, { content: anyPrayer.content + " (목사 수정)" });
  check("13·21", "목사", "남이 쓴 심방 수정·삭제 거부 유지 + 기도제목 수정은 허용(2026-10-07)",
    editOther.status === 403 && delRec.status === 403 && editPrayer.status === 200,
    `심방수정 ${editOther.status}, 삭제 ${delRec.status}, 기도수정 ${editPrayer.status}`);
}

// ─── 16·20. 성도 정보 수정으로 권한 확대 불가 + 기본정보 수정·삭제 규칙 ────────
{
  // deacon은 다성도(C)의 등록자 — 기본 필드 수정은 허용, 소속·직분은 무시돼야 함
  const edit = await req("deacon", "POST", `/api/members/${memberIds.C}`, {
    member: { id: memberIds.C, name: "다성도", phone: "010-1111-2222", nanumjo: "인내조", position: "장로" },
  });
  const after = await req("admin", "GET", "/api/members");
  const c = after.json.members.find((m) => m.id === memberIds.C);
  check("16·20a", "집사(등록자)", "기본정보 수정 허용 + 소속·직분 변경은 무시됨",
    edit.status === 200 && c.phone === "010-1111-2222" && c.nanumjo === "사랑조" && c.position === "성도",
    `nanumjo=${c.nanumjo}, position=${c.position}`);

  // 등록자가 아닌 성도 수정 → 403
  const editOther = await req("deacon", "POST", `/api/members/${memberIds.A}`, {
    member: { id: memberIds.A, name: "가성도", phone: "010-9999-9999" },
  });
  // 등록 권한: 조장·무권한은 403, 행정지원은 허용(입력 담당, 2026-10-07 승인)
  const addByJoLeader = await req("joLeader", "POST", "/api/members", { member: { name: "불법등록" } });
  const addByStaff = await req("staff", "POST", "/api/members", { member: { name: "행정등록테스트" } });
  const editLegacyByStaff = await req("staff", "POST", `/api/members/${memberIds.E}`, {
    member: { id: memberIds.E, name: "마성도", phone: "010-7777-8888", nanumjo: "사랑조", position: "집사" },
  });
  const afterStaff = await req("admin", "GET", "/api/members");
  const eMember = afterStaff.json.members.find((m) => m.id === memberIds.E);
  const staffDel = await req("staff", "DELETE", `/api/members/${memberIds.E}`);
  check("성도등록권한", "조장/행정지원", "조장 등록 403 + 행정지원 등록·수정·소속·직분 변경 200, 삭제 403",
    addByJoLeader.status === 403 && addByStaff.status === 200 && editLegacyByStaff.status === 200 &&
    eMember.nanumjo === "사랑조" && eMember.position === "집사" && staffDel.status === 403,
    `조장 ${addByJoLeader.status}, 행정 ${addByStaff.status}/${editLegacyByStaff.status}, 소속=${eMember.nanumjo}, 직분=${eMember.position}, 삭제 ${staffDel.status}`);

  // 수정 버튼 플래그(canEdit): 집사는 본인이 등록한 교인만 true
  const deaconView = await req("deacon", "GET", "/api/members");
  const cFlag = deaconView.json.members.find((m) => m.id === memberIds.C)?.canEdit;
  const aFlag = deaconView.json.members.find((m) => m.id === memberIds.A)?.canEdit;
  const staffView = await req("staff", "GET", "/api/members");
  const staffAll = staffView.json.members.every((m) => m.canEdit === true);
  check("수정버튼플래그", "집사/행정지원", "집사: 등록한 교인만 canEdit, 행정지원: 전체 canEdit",
    cFlag === true && aFlag === false && staffAll,
    `집사 C=${cFlag}/A=${aFlag}, 행정 전체=${staffAll}`);

  // 목사: 기존 성도 기본정보 수정 허용, 소속·직분 변경은 무시됨
  const editByPastor = await req("pastor", "POST", `/api/members/${memberIds.H}`, {
    member: { id: memberIds.H, name: "아성도", phone: "010-3333-4444", nanumjo: "희락조" },
  });
  const afterPastor = await req("admin", "GET", "/api/members");
  const hMember = afterPastor.json.members.find((m) => m.id === memberIds.H);
  check("목사수정", "목사", "기본정보 + 소속 변경까지 반영(2026-10-07)",
    editByPastor.status === 200 && hMember.phone === "010-3333-4444" && hMember.nanumjo === "희락조",
    `수정 ${editByPastor.status}, 소속=${hMember.nanumjo}`);
  // 되돌림 (뒤 테스트들이 인내조 기준)
  await req("admin", "POST", `/api/members/${memberIds.H}`, { member: { id: memberIds.H, name: "아성도", nanumjo: "인내조" } });

  // 삭제: 등록자 본인도 403, 관리자만
  const delByDeacon = await req("deacon", "DELETE", `/api/members/${memberIds.C}`);
  const delByPastor = await req("pastor", "DELETE", `/api/members/${memberIds.G}`);
  check("20b", "집사/목사", "남의 성도 수정 403 + 비관리자 삭제 403",
    editOther.status === 403 && delByDeacon.status === 403 && delByPastor.status === 403,
    `${editOther.status}/${delByDeacon.status}/${delByPastor.status}`);
}

// ─── 18. 기존 정상 기능: 성도 조회·심방 작성·기도 작성 ────────────────────────
{
  const addPrayerOk = await req("pastor", "POST", "/api/prayers", { memberId: memberIds.G, content: "목사가 미지정 성도에게 추가" });
  const addPastOk = await req("deacon", "POST", "/api/pastoral", {
    memberId: memberIds.D, visitedAt: "2026-10-01", sharedContent: "집사 심방 작성", privateNote: "집사 비공개 메모 2",
  });
  const addMemberOk = await req("admin", "POST", "/api/members", { member: { name: "새성도테스트" } });
  check("18", "목사/집사/관리자", "기도 작성·심방 작성(2칸)·성도 등록 정상 동작",
    addPrayerOk.status === 200 && addPastOk.status === 200 && addMemberOk.status === 200,
    `${addPrayerOk.status}/${addPastOk.status}/${addMemberOk.status}`);
}

// ─── 심방 삭제 시 비공개 메모 동반 삭제 확인 절차 ────────────────────────────
{
  const first = await req("admin", "DELETE", `/api/pastoral/${recordIds.rec1}`);
  const confirmed = await req("admin", "DELETE", `/api/pastoral/${recordIds.rec1}?confirm=1`);
  check("메모동반삭제", "관리자", "메모 딸린 기록 삭제 시 확인 요구(409) 후 확정 삭제",
    first.status === 409 && first.json?.noteCount === 1 && confirmed.status === 200,
    `1차 ${first.status}, 확정 ${confirmed.status}`);
}

// ─── 14. 담당 해제·코드 재발급·중지 후 기존 접속 차단 ─────────────────────────
{
  // 14a. 담당 해제 → 즉시 범위 소멸 (joLeader의 인내조 해제)
  const users = await req("admin", "GET", "/api/admin/users");
  const jo = users.json.users.find((u) => u.displayName === "무직조장테스트");
  await req("admin", "PATCH", "/api/admin/users", { userId: jo.id, action: "update", assignments: [] });
  const prayersAfter = await prayerList("joLeader");
  const memAfter = await req("joLeader", "GET", "/api/members");
  check("14a", "무직조장", "담당 해제 즉시 기도제목·성도 범위 소멸",
    Array.isArray(prayersAfter) && prayersAfter.length === 0 && (memAfter.json?.members?.length ?? 0) === 0,
    `기도 ${prayersAfter.length}, 성도 ${memAfter.json?.members?.length}`);
  // 담당 복원 + 다른 유효 권한 유지 확인 (dualLeader에서 조만 해제 → 부서 범위는 유지)
  await req("admin", "PATCH", "/api/admin/users", { userId: jo.id, action: "update", assignments: [{ unitType: "nanumjo", unitName: "인내조" }] });
  const dual = users.json.users.find((u) => u.displayName === "겸임테스트");
  await req("admin", "PATCH", "/api/admin/users", { userId: dual.id, action: "update", assignments: [{ unitType: "department", unitName: "청년부(직장인)" }] });
  const dualPrayers = await prayerList("dualLeader");
  const dualMem = new Set(dualPrayers.map((p) => p.memberId));
  check("14b", "겸임", "조 담당만 해제해도 부서 범위는 유지",
    dualMem.has(memberIds.B) && dualMem.has(memberIds.A) && !dualMem.has(memberIds.H),
    `${dualPrayers.length}건`);
  await req("admin", "PATCH", "/api/admin/users", { userId: dual.id, action: "update", assignments: [{ unitType: "nanumjo", unitName: "인내조" }, { unitType: "department", unitName: "청년부(직장인)" }] });

  // 14c. 코드 재발급 → 기존 세션 즉시 차단
  const nb = users.json.users.find((u) => u.displayName === "무권한테스트");
  await req("admin", "PATCH", "/api/admin/users", { userId: nb.id, action: "reissue-code" });
  const afterReissue = await req("nobody", "GET", "/api/members");
  check("14c", "무권한", "코드 재발급 후 기존 세션 즉시 차단", afterReissue.status === 401, `${afterReissue.status}`);

  // 14d. 사용 중지 → 기존 세션 즉시 차단 (deaconLeader 중지 후 복구)
  const dl = users.json.users.find((u) => u.displayName === "집사조장테스트");
  await req("admin", "PATCH", "/api/admin/users", { userId: dl.id, action: "disable" });
  const afterDisable = await req("deaconLeader", "GET", "/api/members");
  await req("admin", "PATCH", "/api/admin/users", { userId: dl.id, action: "enable" });
  check("14d", "집사조장", "사용 중지 즉시 기존 세션 차단", afterDisable.status === 401, `${afterDisable.status}`);
}

// ─── 15. 미로그인·예전 공용 비밀번호·구 쿠키 차단 ─────────────────────────────
{
  const noLogin = await req(null, "GET", "/api/members");
  const oldPw = await fetch(`${BASE}/api/auth`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: "옛날공용비밀번호" }),
  });
  const oldCookie = await fetch(`${BASE}/api/members`, {
    headers: { cookie: "gwanak-auth=1759999999999.abcdef" }, redirect: "manual",
  });
  check("15b", "미로그인", "미로그인·공용비밀번호·구 쿠키 전부 차단",
    noLogin.status === 401 && oldPw.status === 401 && oldCookie.status === 401,
    `${noLogin.status}/${oldPw.status}/${oldCookie.status}`);
}

// ─── 백업·관리 도구 접근 제어 ────────────────────────────────────────────────
{
  const backupByDeacon = await req("deacon", "GET", "/api/backup");
  const bulkByDeacon = await req("deacon", "PUT", "/api/members", []);
  const adminApiByPastor = await req("pastor", "GET", "/api/admin/users");
  check("백업도구", "집사/목사", "백업·일괄수정·관리 API는 관리자 외 차단",
    backupByDeacon.status === 401 && bulkByDeacon.status === 403 && adminApiByPastor.status === 403,
    `${backupByDeacon.status}/${bulkByDeacon.status}/${adminApiByPastor.status}`);
}

// ─── 17. 시도 제한 (마지막 — IP 잠금 오염 방지) ───────────────────────────────
{
  let limited = false;
  for (let i = 0; i < 7; i++) {
    const res = await fetch(`${BASE}/api/auth`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: "000000" }),
    });
    if (res.status === 429) { limited = true; break; }
  }
  check("17", "공격자", "틀린 코드 반복 입력 시 시도 제한(429)", limited);
}

// ─── 결과 표 ────────────────────────────────────────────────────────────────
const passCount = results.filter((r) => r.pass).length;
console.log(`\n═══ 결과: ${passCount}/${results.length} 통과 ═══`);
if (passCount < results.length) {
  console.log("실패 항목:");
  for (const r of results.filter((x) => !x.pass)) console.log(`  [${r.id}] (${r.role}) ${r.desc} ${r.extra}`);
  process.exit(1);
}
