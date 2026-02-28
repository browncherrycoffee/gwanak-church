/**
 * Blob에서 교인 데이터 다운로드 → 4025년 날짜 수정 → prayer-import.json 재병합 → 재업로드
 */
import { put, list } from "@vercel/blob";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN;
const __dirname = dirname(fileURLToPath(import.meta.url));

// 1. Blob에서 최신 백업 URL 찾기
async function findLatestBackupUrl() {
  const { blobs } = await list({ token: BLOB_TOKEN, prefix: "gwanak-members" });
  if (blobs.length === 0) throw new Error("No backup found in Blob");
  blobs.sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));
  console.log(`Latest backup: ${blobs[0].url} (${blobs[0].uploadedAt})`);
  return blobs[0].url;
}

// 2. Blob에서 데이터 다운로드
async function downloadBlob(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${BLOB_TOKEN}` },
  });
  if (!res.ok) throw new Error(`Blob fetch failed: ${res.status}`);
  const data = await res.json();
  // 백업 형태: { version, exportedAt, count, members: [...] } 또는 직접 배열
  return Array.isArray(data) ? data : data.members;
}

// 3. 4025년 날짜를 2025년으로 수정
function fixYear4025(members) {
  let fixCount = 0;
  const fixed = members.map((m) => {
    const fixedPrayers = m.prayerRequests?.map((p) => {
      if (p.createdAt && p.createdAt.startsWith("4025-")) {
        fixCount++;
        return { ...p, createdAt: p.createdAt.replace(/^4025-/, "2025-") };
      }
      return p;
    }) ?? [];
    return { ...m, prayerRequests: fixedPrayers };
  });
  console.log(`Fixed ${fixCount} prayer requests with year 4025 → 2025`);
  return fixed;
}

// 4. prayer-import.json 재병합 (content dedup)
function mergePrayerImport(members, importData) {
  let totalAdded = 0;
  const now = new Date().toISOString();

  const nameToMember = new Map(members.map((m) => [m.name, m]));

  const updatedMembers = members.map((m) => {
    const importEntry = importData.find((e) => e.name === m.name);
    if (!importEntry) return m;

    const existingContents = new Set(
      (m.prayerRequests ?? []).map((r) => r.content.trim())
    );

    const newPrayers = importEntry.prayers
      .filter((p) => !existingContents.has(p.content.trim()))
      .map((p) => ({
        id: crypto.randomUUID(),
        content: p.content,
        createdAt: p.createdAt === "미기재" ? now : p.createdAt,
      }));

    if (newPrayers.length === 0) return m;

    totalAdded += newPrayers.length;
    const merged = [...(m.prayerRequests ?? []), ...newPrayers].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );

    return { ...m, prayerRequests: merged, updatedAt: now };
  });

  console.log(`Merged ${totalAdded} new prayer requests from import file`);
  return updatedMembers;
}

async function main() {
  if (!BLOB_TOKEN) {
    throw new Error("BLOB_READ_WRITE_TOKEN not set");
  }

  // 1. Blob에서 다운로드
  const url = await findLatestBackupUrl();
  const members = await downloadBlob(url);
  console.log(`Downloaded ${members.length} members from Blob`);

  // 2. 4025년 날짜 수정
  const fixed = fixYear4025(members);

  // 3. prayer-import.json 재병합
  const importPath = join(__dirname, "../public/data/prayer-import.json");
  const importData = JSON.parse(readFileSync(importPath, "utf-8"));
  console.log(`Import file: ${importData.length} entries`);
  const merged = mergePrayerImport(fixed, importData);

  // 4. 통계
  const totalPrayers = merged.reduce(
    (s, m) => s + (m.prayerRequests?.length ?? 0),
    0
  );
  const membersWithPrayers = merged.filter(
    (m) => (m.prayerRequests?.length ?? 0) > 0
  ).length;
  console.log(
    `Result: ${merged.length} members, ${membersWithPrayers} have prayers, ${totalPrayers} total prayer requests`
  );

  // 날짜 확인
  const sample4025 = merged.flatMap(m => m.prayerRequests ?? []).filter(p => p.createdAt?.startsWith("4025-")).length;
  console.log(`Remaining 4025 dates: ${sample4025}`);

  // 5. Blob에 재업로드 (백업 형태 유지)
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    count: merged.length,
    members: merged,
  };
  const filename = "gwanak-members-backup.json";
  const blob = await put(filename, JSON.stringify(payload), {
    access: "public",
    token: BLOB_TOKEN,
    allowOverwrite: true,
    contentType: "application/json",
    addRandomSuffix: false,
  });
  console.log(`Uploaded to Blob: ${blob.url}`);
  console.log("\n완료! 브라우저에서 백업/복원 페이지로 이동해 '서버에서 불러오기' → '복원 진행'을 눌러주세요.");
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
