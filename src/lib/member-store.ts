"use client";

import type { Member, MemberFormData, PrayerRequest, PastoralVisit } from "@/types";

// ─── in-memory store ────────────────────────────────────────────────────────
let members: Member[] = [];
let listeners: Array<() => void> = [];

// ─── 동기화 상태 ────────────────────────────────────────────────────────────
const pendingPatches = new Set<string>(); // 현재 PATCH 대기 중인 교인 ID
let fullSyncTimer: ReturnType<typeof setTimeout> | null = null;
const patchTimers = new Map<string, ReturnType<typeof setTimeout>>();
let syncListeners: Array<(pending: boolean) => void> = [];
let syncErrorListeners: Array<(error: string | false) => void> = [];

export function subscribeSyncStatus(listener: (pending: boolean) => void) {
  syncListeners = [...syncListeners, listener];
  return () => { syncListeners = syncListeners.filter((l) => l !== listener); };
}

export function subscribeSyncError(listener: (error: string | false) => void) {
  syncErrorListeners = [...syncErrorListeners, listener];
  return () => { syncErrorListeners = syncErrorListeners.filter((l) => l !== listener); };
}

function notifySyncStatus(pending: boolean) {
  for (const l of syncListeners) l(pending);
}

function notifySyncError(error: string | false) {
  for (const l of syncErrorListeners) l(error);
}

// ─── 재시도 큐 (네트워크 실패 시 자동 재시도) ─────────────────────────────────
const retryQueue = new Map<string, number>(); // memberId → retry count
const MAX_RETRIES = 3;
const RETRY_DELAYS = [2_000, 5_000, 10_000]; // exponential backoff

function isDirty() {
  return pendingPatches.size > 0 || fullSyncTimer !== null || patchTimers.size > 0 || retryQueue.size > 0;
}

function scheduleRetry(memberId: string) {
  const count = (retryQueue.get(memberId) ?? 0) + 1;
  if (count > MAX_RETRIES) {
    retryQueue.delete(memberId);
    console.error(`[sync] ${memberId}: ${MAX_RETRIES}회 재시도 실패, 포기`);
    return;
  }
  retryQueue.set(memberId, count);
  const delay = RETRY_DELAYS[count - 1] ?? 10_000;
  console.info(`[sync] ${memberId}: ${delay}ms 후 재시도 (${count}/${MAX_RETRIES})`);
  setTimeout(() => {
    retryQueue.delete(memberId);
    schedulePatch(memberId);
  }, delay);
}

// ─── 개별 교인 POST (~5KB, 500ms) ──────────────────────────────────────────
function schedulePatch(memberId: string) {
  if (typeof window === "undefined") return;
  pendingPatches.add(memberId);
  notifySyncStatus(true);

  const existing = patchTimers.get(memberId);
  if (existing) clearTimeout(existing);

  patchTimers.set(memberId, setTimeout(async () => {
    patchTimers.delete(memberId);
    const member = members.find((m) => m.id === memberId);
    if (!member) {
      pendingPatches.delete(memberId);
      if (!isDirty()) notifySyncStatus(false);
      return;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30_000);
      const res = await fetch(`/api/members/${memberId}`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ member }),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        notifySyncError(false);
        retryQueue.delete(memberId);
      } else if (res.status === 401) {
        notifySyncError("auth");
      } else {
        const body = await res.text().catch(() => "");
        console.error(`[sync] POST ${memberId} → ${res.status}`, body);
        notifySyncError(`server-${res.status}`);
        // 서버 에러 시 재시도
        if (res.status >= 500) scheduleRetry(memberId);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[sync] POST ${memberId}:`, msg);
      notifySyncError(`fetch-${msg.slice(0, 50)}`);
      // 네트워크 에러 시 재시도
      scheduleRetry(memberId);
    }

    pendingPatches.delete(memberId);
    if (!isDirty()) notifySyncStatus(false);
  }, 500));
}

// ─── 전체 PUT (추가/bulk import 전용, 삭제 동기화 없음) ─────────────────────
function scheduleFullSync() {
  if (typeof window === "undefined") return;
  if (fullSyncTimer) clearTimeout(fullSyncTimer);
  notifySyncStatus(true);
  fullSyncTimer = setTimeout(async () => {
    fullSyncTimer = null;
    // 실행 시점의 데이터 캡처 (스냅샷 시점 오류 방지)
    const snapshot = [...members];
    if (snapshot.length === 0) { if (!isDirty()) notifySyncStatus(false); return; }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 60_000);
      const res = await fetch("/api/members", {
        method: "PUT",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(snapshot),
        signal: controller.signal,
      });
      clearTimeout(timeout);

      if (res.ok) {
        notifySyncError(false);
        try {
          const data = await res.json() as { updatedAt?: string };
          if (data?.updatedAt) lastKnownServerUpdatedAt = data.updatedAt;
        } catch { /* ignore */ }
      } else if (res.status === 401) {
        notifySyncError("auth");
      } else {
        console.error(`[sync] PUT → ${res.status}`);
        notifySyncError(`put-${res.status}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[sync] PUT:", msg);
      notifySyncError(`put-${msg.slice(0, 50)}`);
    }

    if (!isDirty()) notifySyncStatus(false);
  }, 1000);
}

// pagehide/beforeunload 즉시 동기화
export function syncNow(): void {
  if (typeof window === "undefined") return;
  if (!isDirty()) return;
  if (fullSyncTimer) { clearTimeout(fullSyncTimer); fullSyncTimer = null; }
  patchTimers.forEach((t) => clearTimeout(t));
  patchTimers.clear();
  pendingPatches.clear();

  // keepalive는 64KB 제한 → 개별 pending patch만 전송
  // 대기 중인 교인만 PATCH (전체 PUT 대신)
  const data = [...members];
  if (data.length === 0) return;

  // 전체 PUT 대기 중이었으면 PUT, 아니면 스킵 (PATCH는 이미 개별 전송됨)
  fetch("/api/members", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
    keepalive: true,
  }).catch(() => { /* best effort */ });
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
  if (isDirty()) return;
  const now = Date.now();
  if (fetchInProgress || now - lastFetchAt < MIN_FETCH_INTERVAL) return;
  fetchInProgress = true;
  lastFetchAt = now;
  try {
    const res = await fetch("/api/members", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json() as { members?: Member[]; exportedAt?: string } | null;
    if (!data?.members || !Array.isArray(data.members) || data.members.length === 0) return;
    if (isDirty()) return;

    members = data.members;
    for (const listener of listeners) listener();
    for (const listener of serverUpdateListeners) listener();
  } catch {
    // 서버 연결 실패 시 in-memory 유지
  } finally {
    fetchInProgress = false;
  }
}

let lastKnownServerUpdatedAt = "";

export async function pollForChanges(): Promise<void> {
  if (typeof window === "undefined") return;
  if (isDirty()) return;
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

// ─── 공개 API ────────────────────────────────────────────────────────────
export function getMembers(): Member[] {
  return members;
}

export function getMember(id: string): Member | undefined {
  return members.find((m) => m.id === id);
}

export function addMember(data: MemberFormData): Member {
  const now = new Date().toISOString();
  const normalized = normalizeData(data);
  const newMember: Member = {
    id: crypto.randomUUID(),
    ...normalized,
    familyMembers: data.familyMembers ?? [],
    memberStatus: data.memberStatus || "활동",
    carNumber: data.carNumber || null,
    prayerRequests: [],
    pastoralVisits: [],
    createdAt: now,
    updatedAt: now,
  };
  members = [newMember, ...members];
  // 새 교인은 POST로 개별 전송 (전체 PUT 대신)
  schedulePatch(newMember.id);
  for (const listener of listeners) listener();
  return newMember;
}

// 빈 문자열을 null로 정규화 (폼에서 빈 입력 시 일관성 보장)
function normalizeData<T extends object>(data: T): T {
  const result = { ...data } as Record<string, unknown>;
  for (const key of Object.keys(result)) {
    if (result[key] === "") result[key] = null;
  }
  return result as T;
}

export function updateMember(id: string, data: Partial<MemberFormData>): Member | null {
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    ...normalizeData(data),
    updatedAt: new Date().toISOString(),
  };
  members = [...members.slice(0, index), updated, ...members.slice(index + 1)];
  schedulePatch(id);
  for (const listener of listeners) listener();
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
  schedulePatch(id);
  for (const listener of listeners) listener();
  return updated;
}

export function deleteMember(id: string): boolean {
  const before = members.length;
  members = members.filter((m) => m.id !== id);
  if (members.length < before) {
    notifySyncStatus(true);
    fetch(`/api/members/${id}`, { method: "DELETE", credentials: "same-origin" })
      .then((res) => {
        if (res.ok) notifySyncError(false);
        else if (res.status === 401) notifySyncError("auth");
        else notifySyncError(`del-${res.status}`);
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : String(err);
        notifySyncError(`del-${msg.slice(0, 30)}`);
      })
      .finally(() => {
        // 다른 pending 작업이 있으면 pending 유지
        if (!isDirty()) notifySyncStatus(false);
      });
    for (const listener of listeners) listener();
    return true;
  }
  return false;
}

export function resetMembers(): void {
  members = [];
  scheduleFullSync();
  for (const listener of listeners) listener();
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
  schedulePatch(memberId);
  for (const listener of listeners) listener();
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
  schedulePatch(memberId);
  for (const listener of listeners) listener();
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
  schedulePatch(memberId);
  for (const listener of listeners) listener();
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
  schedulePatch(memberId);
  for (const listener of listeners) listener();
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
  schedulePatch(memberId);
  for (const listener of listeners) listener();
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
  schedulePatch(memberId);
  for (const listener of listeners) listener();
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
  if (totalAdded > 0) {
    scheduleFullSync();
    for (const listener of listeners) listener();
  }
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
  scheduleFullSync();
  for (const listener of listeners) listener();
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
  patchTimers.forEach((t) => clearTimeout(t));
  patchTimers.clear();
  pendingPatches.clear();
  notifySyncStatus(true);
  try {
    const res = await fetch("/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(members),
    });
    if (!res.ok) {
      notifySyncError(res.status === 401 ? "auth" : `put-${res.status}`);
      notifySyncStatus(false);
      return { ok: false, count: 0 };
    }
    notifySyncError(false);
    try {
      const data = await res.json() as { updatedAt?: string };
      if (data?.updatedAt) lastKnownServerUpdatedAt = data.updatedAt;
    } catch { /* ignore */ }
    notifySyncStatus(false);
    return { ok: true, count: members.length };
  } catch {
    notifySyncStatus(false);
    return { ok: false, count: 0 };
  }
}
