"use client";

import type { Member, MemberFormData } from "@/types";
import { sampleMembers } from "./sample-data";

const STORAGE_KEY = "gwanak-members";
const VERSION_KEY = "gwanak-data-version";
const DATA_VERSION = 9;

function loadFromStorage(): Member[] {
  if (typeof window === "undefined") return [...sampleMembers];
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== String(DATA_VERSION)) {
      // 마이그레이션: 기존 데이터 보존하며 새 필드 추가
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const rawParsed = JSON.parse(stored) as Array<Record<string, unknown>>;
        if (Array.isArray(rawParsed) && rawParsed.length > 0) {
          const migrated: Member[] = rawParsed.map((raw) => {
            const m = raw as unknown as Member;
            const existingFamily = Array.isArray(m.familyMembers) ? m.familyMembers : [];
            const legacyHead = (m as unknown as Record<string, unknown>).familyHead;
            const familyMembers = existingFamily.length > 0
              ? existingFamily
              : (legacyHead && typeof legacyHead === "string" ? [legacyHead] : []);
            return {
              ...m,
              familyMembers,
              carNumber: m.carNumber ?? null,
              prayerRequests: Array.isArray(m.prayerRequests) ? m.prayerRequests : [],
              pastoralVisits: Array.isArray(m.pastoralVisits) ? m.pastoralVisits : [],
            };
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
          localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
          return migrated;
        }
      }
      localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
      return [...sampleMembers];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Member[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  try {
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
  } catch {
    // ignore
  }
  return [...sampleMembers];
}

function saveToStorage(data: Member[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    localStorage.setItem(VERSION_KEY, String(DATA_VERSION));
  } catch {
    // ignore storage errors (quota exceeded, etc.)
  }
}

let members: Member[] = loadFromStorage();
let listeners: Array<() => void> = [];

// ─── 동기화 상태 ────────────────────────────────────────────────────────────
let fullSyncTimer: ReturnType<typeof setTimeout> | null = null;
const memberSyncTimers = new Map<string, ReturnType<typeof setTimeout>>();
let syncListeners: Array<(pending: boolean) => void> = [];
let syncErrorListeners: Array<(hasError: boolean) => void> = [];

export function subscribeSyncStatus(listener: (pending: boolean) => void) {
  syncListeners = [...syncListeners, listener];
  return () => { syncListeners = syncListeners.filter((l) => l !== listener); };
}

export function subscribeSyncError(listener: (hasError: boolean) => void) {
  syncErrorListeners = [...syncErrorListeners, listener];
  return () => { syncErrorListeners = syncErrorListeners.filter((l) => l !== listener); };
}

function notifySyncStatus(pending: boolean) {
  for (const l of syncListeners) l(pending);
}

function notifySyncError(hasError: boolean) {
  for (const l of syncErrorListeners) l(hasError);
}

function isPending() {
  return fullSyncTimer !== null || memberSyncTimers.size > 0;
}

// 전체 배열 PUT — 교인 추가/삭제/일괄 작업 시
function scheduleSync() {
  if (typeof window === "undefined") return;
  if (fullSyncTimer) clearTimeout(fullSyncTimer);
  notifySyncStatus(true);
  fullSyncTimer = setTimeout(async () => {
    fullSyncTimer = null;
    try {
      const res = await fetch("/api/members", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(members),
      });
      if (!res.ok && res.status === 401) notifySyncError(true);
      else notifySyncError(false);
    } catch {
      // 네트워크 오류 무시
    }
    if (!isPending()) notifySyncStatus(false);
  }, 1000);
}

// 교인 1명 PATCH — 수정 시 다른 교인 데이터 덮어쓰기 방지
function scheduleMemberSync(memberId: string) {
  if (typeof window === "undefined") return;
  const existing = memberSyncTimers.get(memberId);
  if (existing) clearTimeout(existing);
  notifySyncStatus(true);
  const timer = setTimeout(async () => {
    memberSyncTimers.delete(memberId);
    const member = members.find((m) => m.id === memberId);
    if (member) {
      try {
        const res = await fetch(`/api/members/${memberId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ member }),
        });
        if (!res.ok) {
          if (res.status === 401) notifySyncError(true);
          else scheduleSync(); // PATCH 실패 시 전체 PUT 폴백
        } else {
          notifySyncError(false);
        }
      } catch {
        scheduleSync(); // 네트워크 오류 시 전체 PUT 폴백
      }
    }
    if (!isPending()) notifySyncStatus(false);
  }, 1000);
  memberSyncTimers.set(memberId, timer);
}

export function syncNow(): void {
  if (typeof window === "undefined") return;
  // 대기 중인 타이머 모두 취소 후 전체 PUT
  if (fullSyncTimer) { clearTimeout(fullSyncTimer); fullSyncTimer = null; }
  memberSyncTimers.forEach((t) => clearTimeout(t));
  memberSyncTimers.clear();
  fetch("/api/members", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(members),
    keepalive: true,
  })
    .then(() => notifySyncStatus(false))
    .catch(() => notifySyncStatus(false));
}

// 서버에서 최신 데이터 불러오기 (중복 호출 방지)
let fetchInProgress = false;
let lastFetchAt = 0;
const MIN_FETCH_INTERVAL = 1_500; // 1.5초 내 재호출 무시

// 서버에서 실제로 새 데이터를 받아왔을 때 알림 (다른 기기 업데이트 감지)
let serverUpdateListeners: Array<() => void> = [];

export function subscribeServerUpdate(listener: () => void) {
  serverUpdateListeners = [...serverUpdateListeners, listener];
  return () => { serverUpdateListeners = serverUpdateListeners.filter((l) => l !== listener); };
}

export async function initFromServer(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (fetchInProgress || now - lastFetchAt < MIN_FETCH_INTERVAL) return;
  fetchInProgress = true;
  lastFetchAt = now;
  try {
    const res = await fetch("/api/members", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    if (!data?.members?.length) return;

    const serverTime = new Date(data.exportedAt).getTime();
    const localModified = parseInt(localStorage.getItem("gwanak-last-modified") ?? "0");

    // force=true: 폴링이 새 버전을 감지했을 때 → 타임스탬프 비교 없이 무조건 적용
    // force=false: 탭 전환 등 일반 초기화 → 로컬이 더 최신이면 스킵
    if (force || serverTime > localModified) {
      members = data.members;
      saveToStorage(members);
      localStorage.setItem("gwanak-last-modified", String(serverTime));
      for (const listener of listeners) listener();
      for (const listener of serverUpdateListeners) listener();
    }
  } catch {
    // 서버 연결 실패 시 localStorage 유지
  } finally {
    fetchInProgress = false;
  }
}

// 버전 타임스탬프만 확인 후 변경된 경우에만 전체 데이터 로드 — 폴링 비용 최소화
let lastKnownServerUploadedAt = "";

export async function pollForChanges(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/members/version", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json() as { uploadedAt?: string } | null;
    if (!data?.uploadedAt) return;

    // 이미 알고 있는 버전이면 전체 로드 스킵
    if (data.uploadedAt === lastKnownServerUploadedAt) return;

    lastKnownServerUploadedAt = data.uploadedAt;
    await initFromServer(true); // 새 버전 감지됨 → 강제 적용
  } catch {
    // 네트워크 오류 무시
  }
}

// memberId 있으면 교인 1명 PATCH, 없으면 전체 PUT (추가/삭제/일괄)
function notify(memberId?: string) {
  saveToStorage(members);
  localStorage.setItem("gwanak-last-modified", String(Date.now()));
  if (memberId) scheduleMemberSync(memberId);
  else scheduleSync();
  for (const listener of listeners) listener();
}

export function getMembers(): Member[] {
  return members;
}

export function getMember(id: string): Member | undefined {
  return members.find((m) => m.id === id);
}

export function addMember(data: MemberFormData): Member {
  const now = new Date().toISOString();
  const newMember: Member = {
    id: crypto.randomUUID(),
    ...data,
    familyMembers: data.familyMembers ?? [],
    memberStatus: data.memberStatus || "활동",
    carNumber: data.carNumber || null,
    prayerRequests: [],
    pastoralVisits: [],
    createdAt: now,
    updatedAt: now,
  };
  members = [newMember, ...members];
  notify();
  return newMember;
}

export function updateMember(id: string, data: Partial<MemberFormData>): Member | null {
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    ...data,
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(id);
  return updated;
}

export function toggleMemberStatus(id: string): Member | null {
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const next = existing.memberStatus === "활동" ? "비활동" : "활동";
  const updated: Member = {
    ...existing,
    memberStatus: next,
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(id);
  return updated;
}

export function deleteMember(id: string): boolean {
  const before = members.length;
  members = members.filter((m) => m.id !== id);
  if (members.length < before) {
    notify();
    return true;
  }
  return false;
}

export function resetMembers(): void {
  members = [...sampleMembers];
  notify();
}

export function addPrayerRequest(memberId: string, content: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    prayerRequests: [
      { id: crypto.randomUUID(), content, createdAt: new Date().toISOString() },
      ...existing.prayerRequests,
    ],
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(memberId);
  return updated;
}

export function deletePrayerRequest(memberId: string, requestId: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    prayerRequests: existing.prayerRequests.filter((r) => r.id !== requestId),
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(memberId);
  return updated;
}

export function addPastoralVisit(memberId: string, visitedAt: string, content: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    pastoralVisits: [
      { id: crypto.randomUUID(), visitedAt, content, createdAt: new Date().toISOString() },
      ...existing.pastoralVisits,
    ],
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(memberId);
  return updated;
}

export function deletePastoralVisit(memberId: string, visitId: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    pastoralVisits: existing.pastoralVisits.filter((v) => v.id !== visitId),
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify();
  return updated;
}

export function updatePrayerRequest(memberId: string, requestId: string, content: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    prayerRequests: existing.prayerRequests.map((r) =>
      r.id === requestId ? { ...r, content } : r,
    ),
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(memberId);
  return updated;
}

export function updatePastoralVisit(memberId: string, visitId: string, visitedAt: string, content: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    pastoralVisits: existing.pastoralVisits.map((v) =>
      v.id === visitId ? { ...v, visitedAt, content } : v,
    ),
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  notify(memberId);
  return updated;
}

export function bulkAddPrayerRequests(
  entries: { memberId: string; prayers: { content: string; createdAt: string }[] }[],
): { totalAdded: number } {
  const now = new Date().toISOString();
  let totalAdded = 0;
  members = members.map((m) => {
    const entry = entries.find((e) => e.memberId === m.id);
    if (!entry) return m;
    const existingContents = new Set(m.prayerRequests.map((r) => r.content.trim()));
    const newRequests = entry.prayers
      .filter((p) => !existingContents.has(p.content.trim()))
      .map((p) => ({
        id: crypto.randomUUID(),
        content: p.content,
        createdAt: p.createdAt === "미기재" ? now : p.createdAt,
      }));
    if (newRequests.length === 0) return m;
    totalAdded += newRequests.length;
    const merged = [...m.prayerRequests, ...newRequests].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    return { ...m, prayerRequests: merged, updatedAt: now };
  });
  if (totalAdded > 0) notify();
  return { totalAdded };
}


const PRAYER_IMPORT_VERSION_KEY = "gwanak-prayer-import-version";

export async function autoApplyPrayerImport(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/data/prayer-import.json");
    if (!res.ok) return;
    const data = await res.json() as { version?: string; members?: Array<{ name: string; prayers: Array<{ createdAt: string; content: string }> }> };
    if (!data?.version || !Array.isArray(data.members)) return;

    const applied = localStorage.getItem(PRAYER_IMPORT_VERSION_KEY);
    if (applied === data.version) return;

    const nameToId = new Map(members.map((m) => [m.name, m.id]));
    const entries = data.members
      .map((entry) => {
        const memberId = nameToId.get(entry.name);
        if (!memberId) return null;
        return { memberId, prayers: entry.prayers };
      })
      .filter((e): e is { memberId: string; prayers: { content: string; createdAt: string }[] } => e !== null);

    const { totalAdded } = bulkAddPrayerRequests(entries);
    localStorage.setItem(PRAYER_IMPORT_VERSION_KEY, data.version);
    if (totalAdded > 0) {
      console.info(`[prayer-import] ${data.version} 버전 적용: ${totalAdded}건 추가`);
    }
  } catch {
    // ignore
  }
}

export function replaceMembers(newMembers: Member[]): void {
  members = newMembers;
  notify();
}

export function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
