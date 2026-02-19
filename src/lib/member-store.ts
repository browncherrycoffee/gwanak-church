"use client";

import type { Member, MemberFormData } from "@/types";
import { sampleMembers } from "./sample-data";

const STORAGE_KEY = "gwanak-members";

function loadFromStorage(): Member[] {
  if (typeof window === "undefined") return [...sampleMembers];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Member[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    // ignore parse errors
  }
  return [...sampleMembers];
}

function saveToStorage(data: Member[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
    isActive: true,
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

export function toggleMemberActive(id: string): Member | null {
  const index = members.findIndex((m) => m.id === id);
  if (index === -1) return null;
  const existing = members[index];
  if (!existing) return null;

  const updated: Member = {
    ...existing,
    isActive: !existing.isActive,
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

export function subscribe(listener: () => void) {
  listeners = [...listeners, listener];
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}
