"use client";

// 기도제목 저장소 — 새 권한 API(/api/prayers) 기반.
// 서버가 내 권한 범위의 기도제목만 내려주며, 추가·수정·삭제도 서버가 다시 검증한다.

export interface PrayerItem {
  id: string;
  memberId: string;
  content: string;
  authorName: string;
  authorUserId: string | null;
  lastEditorName: string | null;
  createdAt: string;
  updatedAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

let prayers: PrayerItem[] = [];
let loaded = false;
let listeners: Array<() => void> = [];

export function subscribePrayers(listener: () => void) {
  listeners = [...listeners, listener];
  return () => { listeners = listeners.filter((l) => l !== listener); };
}

function notify() {
  for (const l of listeners) l();
}

export function getPrayers(): PrayerItem[] {
  return prayers;
}

export function getPrayersByMember(memberId: string): PrayerItem[] {
  return prayers.filter((p) => p.memberId === memberId);
}

let fetchInProgress = false;

export async function loadPrayers(force = false): Promise<void> {
  if (typeof window === "undefined") return;
  if (loaded && !force) return;
  if (fetchInProgress) return;
  fetchInProgress = true;
  try {
    const res = await fetch("/api/prayers", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { prayers?: PrayerItem[] };
    if (Array.isArray(data.prayers)) {
      prayers = data.prayers;
      loaded = true;
      notify();
    }
  } catch {
    // 네트워크 오류 — 기존 상태 유지
  } finally {
    fetchInProgress = false;
  }
}

export async function addPrayer(
  memberId: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/prayers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId, content }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `오류 (${res.status})` };
    await loadPrayers(true);
    return { ok: true };
  } catch {
    return { ok: false, error: "네트워크 오류" };
  }
}

export async function updatePrayer(
  id: string,
  content: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/prayers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `오류 (${res.status})` };
    await loadPrayers(true);
    return { ok: true };
  } catch {
    return { ok: false, error: "네트워크 오류" };
  }
}

export async function deletePrayer(id: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`/api/prayers/${id}`, { method: "DELETE" });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) return { ok: false, error: data.error ?? `오류 (${res.status})` };
    await loadPrayers(true);
    return { ok: true };
  } catch {
    return { ok: false, error: "네트워크 오류" };
  }
}
