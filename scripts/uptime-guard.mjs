// 교적부 업타임 가드 — 한국(사용자 Mac)에서 실행되어 실제 사용자와 동일한
// Vercel 엣지 노드(icn1)를 통해 사이트를 점검한다. GitHub Actions(미국 서버)는
// 한국 전용 엣지 장애를 감지하지 못하므로, 이 스크립트가 보완한다.
//
// 동작:
//  1) 사이트를 여러 번 호출해 404 / DEPLOYMENT_NOT_FOUND / 5xx 를 탐지
//  2) 장애 감지 시 `vercel --prod` 로 자동 재배포(자가복구) 후 복구 확인
//  3) 배포본이 5일 넘게 노후하면 선제적 keep-warm 재배포(prune 방지 = 근본원인 차단)
//  4) TELEGRAM_BOT_TOKEN/CHAT_ID 가 .env.local 에 있으면 결과를 텔레그램 보고
//
// launchd(com.gwanak.uptime)가 20분마다 실행. 로그: 관악교회 교적부 백업 데이터/uptime-guard.log
import { execSync } from "node:child_process";
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const SITE_URL = "https://gwanak-church.vercel.app";
const PROJECT_DIR = dirname(dirname(fileURLToPath(import.meta.url)));
const STATE_FILE = join(PROJECT_DIR, "관악교회 교적부 백업 데이터", ".uptime-guard-state.json");
const KEEP_WARM_DAYS = 5;        // 배포본이 이보다 오래되면 선제 재배포
const REDEPLOY_COOLDOWN_MIN = 30; // 재배포 폭주 방지(최소 간격)

const BOT = process.env.TELEGRAM_BOT_TOKEN;
const CHAT = process.env.TELEGRAM_CHAT_ID;

const now = Date.now();
const stamp = () => new Date(now).toISOString();
function log(msg) { console.log(`[${stamp()}] ${msg}`); }

function loadState() {
  try { return JSON.parse(readFileSync(STATE_FILE, "utf8")); }
  catch { return { lastRedeployMs: 0, lastKeepWarmMs: 0 }; }
}
function saveState(s) { try { writeFileSync(STATE_FILE, JSON.stringify(s, null, 2)); } catch {} }

async function telegram(text) {
  if (!BOT || !CHAT) { log("텔레그램 미설정 — 보고 생략(로그만 기록)"); return; }
  try {
    await fetch(`https://api.telegram.org/bot${BOT}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: CHAT, text, disable_web_page_preview: true }),
    });
  } catch (e) { log(`텔레그램 전송 실패: ${e.message}`); }
}

// 사이트가 정상인지 — 여러 번 호출해 엣지 노드별 간헐 장애까지 포착
async function probe() {
  const bad = [];
  for (let i = 0; i < 4; i++) {
    try {
      const res = await fetch(SITE_URL, { redirect: "manual", cache: "no-store" });
      const vid = res.headers.get("x-vercel-id") || "?";
      const okStatus = res.status === 307 || res.status === 200 || res.status === 308;
      let body = "";
      if (!okStatus) body = await res.text().catch(() => "");
      const deployMissing = /DEPLOYMENT_NOT_FOUND|This page doesn.?t exist/i.test(body);
      if (!okStatus || deployMissing) {
        bad.push(`HTTP ${res.status}${deployMissing ? " DEPLOYMENT_NOT_FOUND" : ""} @ ${vid}`);
      }
    } catch (e) {
      bad.push(`요청 실패: ${e.message}`);
    }
  }
  return bad;
}

function redeploy(reason) {
  log(`재배포 시작 (${reason})`);
  execSync("vercel --prod --yes", { cwd: PROJECT_DIR, stdio: "inherit", timeout: 300000 });
  log("재배포 완료");
}

// 현재 운영 배포본 나이(일). 실패 시 null
function deploymentAgeDays() {
  try {
    const out = execSync("vercel ls gwanak-church 2>/dev/null", { cwd: PROJECT_DIR, encoding: "utf8", timeout: 60000 });
    const line = out.split("\n").find((l) => /Ready/.test(l) && /Production/.test(l));
    const m = line && line.match(/(\d+)([mhd])\b/); // "6d", "3h", "40m"
    if (!m) return null;
    const n = Number(m[1]);
    return m[2] === "d" ? n : m[2] === "h" ? n / 24 : n / 1440;
  } catch { return null; }
}

(async () => {
  const state = loadState();
  const minsSinceRedeploy = (now - (state.lastRedeployMs || 0)) / 60000;

  const bad = await probe();

  if (bad.length) {
    log(`🚨 장애 감지 (${bad.length}/4): ${bad.join(" | ")}`);
    if (minsSinceRedeploy < REDEPLOY_COOLDOWN_MIN) {
      log(`쿨다운 중(${minsSinceRedeploy.toFixed(0)}분 전 재배포) — 중복 재배포 보류`);
      await telegram(`🚨 교적부 장애 감지\n${bad.join("\n")}\n(쿨다운으로 자동 재배포 보류 — 수동 확인 필요)`);
      process.exit(1);
    }
    try {
      redeploy("장애 자가복구");
      state.lastRedeployMs = now; state.lastKeepWarmMs = now; saveState(state);
      const after = await probe();
      if (after.length) {
        await telegram(`🚨 교적부 장애 — 자동 재배포했으나 아직 비정상\n재배포 후: ${after.join(" | ")}\n수동 점검 필요`);
        process.exit(1);
      }
      await telegram(`⚠️→✅ 교적부 장애 자동복구 완료\n감지: ${bad.join(" | ")}\n자동 재배포 후 정상 응답 확인`);
      log("자가복구 성공");
    } catch (e) {
      log(`재배포 실패: ${e.message}`);
      await telegram(`🚨 교적부 장애 — 자동 재배포 실패: ${e.message}\n즉시 수동 조치 필요`);
      process.exit(1);
    }
    return;
  }

  log("사이트 정상 (4/4)");

  // 선제 keep-warm: 배포본 노후화로 인한 엣지 prune 방지
  const age = deploymentAgeDays();
  if (age != null && age >= KEEP_WARM_DAYS && minsSinceRedeploy >= REDEPLOY_COOLDOWN_MIN) {
    log(`배포본 ${age.toFixed(1)}일 경과 — 선제 keep-warm 재배포`);
    try {
      redeploy("keep-warm");
      state.lastRedeployMs = now; state.lastKeepWarmMs = now; saveState(state);
      log("keep-warm 완료");
    } catch (e) { log(`keep-warm 실패: ${e.message}`); }
  } else if (age != null) {
    log(`배포본 나이 ${age.toFixed(1)}일 (keep-warm 기준 ${KEEP_WARM_DAYS}일 미만)`);
  }
})();
