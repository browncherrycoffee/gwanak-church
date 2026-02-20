"use client";

import type { Member, MemberFormData } from "@/types";
import { sampleMembers } from "./sample-data";

const STORAGE_KEY = "gwanak-members";
const VERSION_KEY = "gwanak-data-version";
const DATA_VERSION = 5;

function loadFromStorage(): Member[] {
  if (typeof window === "undefined") return [...sampleMembers];
  try {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    if (storedVersion !== String(DATA_VERSION)) {
      localStorage.removeItem(STORAGE_KEY);
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

export function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
