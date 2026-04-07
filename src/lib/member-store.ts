"use client";

import type { Member, MemberFormData, PrayerRequest, PastoralVisit } from "@/types";

// ─── in-memory store ────────────────────────────────────────────────────────
let members: Member[] = [];
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

// 전체 배열 PUT — 교인 추가/삭제/일괄 작업 시 (bulk import/restore)
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
        } else {
          notifySyncError(false);
        }
      } catch {
        // 네트워크 오류 무시
      }
    }
    if (!isPending()) notifySyncStatus(false);
  }, 1000);
  memberSyncTimers.set(memberId, timer);
}

export function syncNow(): void {
  if (typeof window === "undefined") return;
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

// ─── 서버 초기화 / 폴링 ────────────────────────────────────────────────────
let fetchInProgress = false;
let lastFetchAt = 0;
const MIN_FETCH_INTERVAL = 1_500;

let serverUpdateListeners: Array<() => void> = [];

export function subscribeServerUpdate(listener: () => void) {
  serverUpdateListeners = [...serverUpdateListeners, listener];
  return () => { serverUpdateListeners = serverUpdateListeners.filter((l) => l !== listener); };
}

export async function initFromServer(_force = false): Promise<void> {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (fetchInProgress || now - lastFetchAt < MIN_FETCH_INTERVAL) return;
  fetchInProgress = true;
  lastFetchAt = now;
  try {
    const res = await fetch("/api/members", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json() as { members?: Member[]; exportedAt?: string } | null;
    if (!data?.members || !Array.isArray(data.members) || data.members.length === 0) return;

    members = data.members;
    for (const listener of listeners) listener();
    for (const listener of serverUpdateListeners) listener();
  } catch {
    // 서버 연결 실패 시 in-memory 유지
  } finally {
    fetchInProgress = false;
  }
}

// 버전 타임스탬프만 확인 후 변경된 경우에만 전체 데이터 로드 — 폴링 비용 최소화
let lastKnownServerUpdatedAt = "";

export async function pollForChanges(): Promise<void> {
  if (typeof window === "undefined") return;
  try {
    const res = await fetch("/api/members/version", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json() as { updatedAt?: string } | null;
    if (!data?.updatedAt) return;

    if (data.updatedAt === lastKnownServerUpdatedAt) return;

    lastKnownServerUpdatedAt = data.updatedAt;
    fetchInProgress = false;
    lastFetchAt = 0;
    await initFromServer(true);
  } catch {
    // 네트워크 오류 무시
  }
}

// ─── notify ────────────────────────────────────────────────────────────────
function notify(memberId?: string) {
  if (memberId) scheduleMemberSync(memberId);
  else scheduleSync();
  for (const listener of listeners) listener();
}

// ─── 공개 API ────────────────────────────────────────────────────────────
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
    if (typeof window !== "undefined") {
      fetch(`/api/members/${id}`, { method: "DELETE" }).catch(() => undefined);
    }
    for (const listener of listeners) listener();
    return true;
  }
  return false;
}

export function resetMembers(): void {
  members = [];
  notify();
}

export function addPrayerRequest(memberId: string, content: string): Member | null {
  const index = members.findIndex((m) => m.id === memberId);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const newRequest: PrayerRequest = {
    id: crypto.randomUUID(),
    content,
    createdAt: new Date().toISOString(),
  };
  const updated: Member = {
    ...existing,
    prayerRequests: [newRequest, ...existing.prayerRequests],
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

  const newVisit: PastoralVisit = {
    id: crypto.randomUUID(),
    visitedAt,
    content,
    createdAt: new Date().toISOString(),
  };
  const updated: Member = {
    ...existing,
    pastoralVisits: [newVisit, ...existing.pastoralVisits],
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
  notify(memberId);
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
      .map((p): PrayerRequest => ({
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

export async function autoApplyPrayerImport(): Promise<void> {
  if (typeof window === "undefined") return;
  const PRAYER_IMPORT_VERSION_KEY = "gwanak-prayer-import-version";
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

// 현재 기기의 전체 데이터를 서버에 강제 업로드 (데이터 복구용)
export async function forceSyncToServer(): Promise<{ ok: boolean; count: number }> {
  if (typeof window === "undefined") return { ok: false, count: 0 };
  if (fullSyncTimer) { clearTimeout(fullSyncTimer); fullSyncTimer = null; }
  memberSyncTimers.forEach((t) => clearTimeout(t));
  memberSyncTimers.clear();
  notifySyncStatus(true);
  try {
    const res = await fetch("/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(members),
    });
    if (!res.ok) {
      if (res.status === 401) notifySyncError(true);
      notifySyncStatus(false);
      return { ok: false, count: 0 };
    }
    notifySyncError(false);
    notifySyncStatus(false);
    return { ok: true, count: members.length };
  } catch {
    notifySyncStatus(false);
    return { ok: false, count: 0 };
  }
}
