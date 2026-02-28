"use client";

import type { Member, MemberFormData } from "@/types";
import { sampleMembers } from "./sample-data";

const STORAGE_KEY = "gwanak-members";
const VERSION_KEY = "gwanak-data-version";
const DATA_VERSION = 8;

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
            return {
              ...m,
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

function notify() {
  saveToStorage(members);
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
  notify();
  return { totalAdded };
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
