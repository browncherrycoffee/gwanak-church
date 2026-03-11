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

// 자동 서버 동기화 (1초 debounce)
let syncTimer: ReturnType<typeof setTimeout> | null = null;
let syncListeners: Array<(pending: boolean) => void> = [];

export function subscribeSyncStatus(listener: (pending: boolean) => void) {
  syncListeners = [...syncListeners, listener];
  return () => { syncListeners = syncListeners.filter((l) => l !== listener); };
}

function notifySyncStatus(pending: boolean) {
  for (const l of syncListeners) l(pending);
}

function scheduleSync() {
  if (typeof window === "undefined") return;
  if (syncTimer) clearTimeout(syncTimer);
  notifySyncStatus(true);
  syncTimer = setTimeout(() => {
    syncTimer = null;
    fetch("/api/members", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(members),
    })
      .then(() => notifySyncStatus(false))
      .catch(() => notifySyncStatus(false));
  }, 1000);
}

export function syncNow(): void {
  if (typeof window === "undefined") return;
  if (syncTimer) { clearTimeout(syncTimer); syncTimer = null; }
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
const MIN_FETCH_INTERVAL = 3_000; // 3초 내 재호출 무시

export async function initFromServer(): Promise<void> {
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

    if (serverTime > localModified) {
      members = data.members;
      saveToStorage(members);
      localStorage.setItem("gwanak-last-modified", String(serverTime));
      for (const listener of listeners) listener();
    }
  } catch {
    // 서버 연결 실패 시 localStorage 유지
  } finally {
    fetchInProgress = false;
  }
}

function notify() {
  saveToStorage(members);
  localStorage.setItem("gwanak-last-modified", String(Date.now()));
  scheduleSync();
  for (const listener of listeners) {
    listener();
  }
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
  notify();
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
  notify();
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
  notify();
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
  notify();
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
  notify();
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
  notify();
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
  notify();
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
