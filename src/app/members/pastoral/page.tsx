"use client";

import { useState, useSyncExternalStore, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  Plus,
  CaretUp,
  PencilSimple,
  Trash,
  Check,
  X,
  Lock,
} from "@phosphor-icons/react";
import { getMembers, subscribe, getAuthInfo, loadAuthInfo, subscribeAuth } from "@/lib/member-store";

// ─── 타입 정의 ─────────────────────────────────────────────────────────────

interface PrivateNote {
  id: string;
  content: string;
  authorName: string;
  authorUserId: string;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}

interface PastoralRecord {
  id: string;
  memberId: string;
  visitedAt: string | null;
  sharedContent: string | null;
  authorName: string;
  authorUserId: string;
  createdAt: string;
  updatedAt?: string;
  canEdit: boolean;
  canDelete: boolean;
  privateNotes: PrivateNote[];
}

// ─── 권한 판단 ─────────────────────────────────────────────────────────────

const ALLOWED_GRADES = ["목사", "장로", "집사"];

function hasViewPermission(): boolean {
  const info = getAuthInfo();
  if (!info || !info.authenticated) return false;
  if (info.isAdmin) return true;
  if (info.roleGrade && ALLOWED_GRADES.includes(info.roleGrade)) return true;
  return false;
}

// ─── 날짜 포맷 ─────────────────────────────────────────────────────────────

function formatDate(iso: string | null): string {
  if (!iso) return "";
  const d = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return iso;
  const [y, m, day] = d.split("-");
  return `${y}년 ${m}월 ${day}일`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// ─── 월 그룹핑 ─────────────────────────────────────────────────────────────

function monthLabel(isoDate: string | null): string {
  if (!isoDate) return "날짜 미기재";
  const m = /^(\d{4})-(\d{2})/.exec(isoDate);
  if (!m) return "날짜 미기재";
  return `${m[1]}년 ${m[2]}월`;
}

// ─── 비공개 메모 인라인 수정 컴포넌트 ────────────────────────────────────────

function NoteRow({
  note,
  recordId,
  onUpdated,
}: {
  note: PrivateNote;
  recordId: string;
  onUpdated: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note.content);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function saveNote() {
    if (!draft.trim()) return;
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/pastoral/${recordId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ noteId: note.id, content: draft.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "저장 실패");
        return;
      }
      setEditing(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm">
      <div className="flex items-center gap-2 mb-1.5">
        <Lock weight="fill" className="h-3.5 w-3.5 text-yellow-600 shrink-0" />
        <span className="text-xs font-semibold text-yellow-700">비공개</span>
        <span className="text-xs text-muted-foreground ml-auto">{note.authorName} · {formatDate(note.createdAt.slice(0, 10))}</span>
        {note.canEdit && !editing && (
          <button
            type="button"
            onClick={() => { setDraft(note.content); setEditing(true); }}
            className="p-1 rounded hover:bg-yellow-100 text-yellow-600 transition-colors"
          >
            <PencilSimple weight="regular" className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={3}
            className="w-full rounded border border-yellow-300 bg-white px-2 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-400"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveNote}
              disabled={saving}
              className="flex items-center gap-1 rounded-md bg-yellow-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-yellow-700 disabled:opacity-50 transition-colors"
            >
              <Check weight="bold" className="h-3 w-3" />
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="flex items-center gap-1 rounded-md border px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <X weight="bold" className="h-3 w-3" />
              취소
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-foreground/80 whitespace-pre-wrap">{note.content}</p>
      )}
    </div>
  );
}

// ─── 심방기록 카드 ──────────────────────────────────────────────────────────

function RecordCard({
  record,
  memberName,
  onUpdated,
  onDeleted,
}: {
  record: PastoralRecord;
  memberName: string;
  onUpdated: () => void;
  onDeleted: () => void;
}) {
  const [editingShared, setEditingShared] = useState(false);
  const [sharedDraft, setSharedDraft] = useState(record.sharedContent ?? "");
  const [visitedAtDraft, setVisitedAtDraft] = useState(record.visitedAt ?? "");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ noteCount: number } | null>(null);

  async function saveShared() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/pastoral/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sharedContent: sharedDraft, visitedAt: visitedAtDraft || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "저장 실패");
        return;
      }
      setEditingShared(false);
      onUpdated();
    } finally {
      setSaving(false);
    }
  }

  async function deleteRecord(force = false) {
    setDeleting(true);
    setError("");
    try {
      const url = `/api/pastoral/${record.id}${force ? "?confirm=1" : ""}`;
      const res = await fetch(url, { method: "DELETE" });
      if (res.status === 409) {
        const data = await res.json().catch(() => ({})) as { noteCount?: number };
        setConfirmDelete({ noteCount: data.noteCount ?? 0 });
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "삭제 실패");
        return;
      }
      onDeleted();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 space-y-3">
      {/* 헤더: 이름, 심방일, 작성자 */}
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-baseline gap-2 flex-wrap">
            <Link
              href={`/members/${record.memberId}`}
              className="font-semibold text-base hover:text-primary transition-colors"
            >
              {memberName}
            </Link>
            {record.visitedAt && (
              <span className="text-xs text-muted-foreground">{formatDate(record.visitedAt)}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">{record.authorName} 작성</p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {record.canEdit && !editingShared && (
            <button
              type="button"
              onClick={() => {
                setSharedDraft(record.sharedContent ?? "");
                setVisitedAtDraft(record.visitedAt ?? "");
                setEditingShared(true);
              }}
              className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <PencilSimple weight="regular" className="h-4 w-4" />
            </button>
          )}
          {record.canDelete && (
            <button
              type="button"
              onClick={() => deleteRecord(false)}
              disabled={deleting}
              className="rounded-md p-2 text-muted-foreground hover:text-destructive hover:bg-secondary transition-colors"
            >
              <Trash weight="regular" className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* 공유 내용 */}
      {editingShared ? (
        <div className="space-y-2">
          <input
            type="date"
            value={visitedAtDraft}
            onChange={(e) => setVisitedAtDraft(e.target.value)}
            className="flex h-9 rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <textarea
            value={sharedDraft}
            onChange={(e) => setSharedDraft(e.target.value)}
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveShared}
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check weight="bold" className="h-3.5 w-3.5" />
              저장
            </button>
            <button
              type="button"
              onClick={() => setEditingShared(false)}
              className="flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X weight="bold" className="h-3.5 w-3.5" />
              취소
            </button>
          </div>
        </div>
      ) : (
        record.sharedContent && (
          <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{record.sharedContent}</p>
        )
      )}

      {/* 비공개 메모 */}
      {record.privateNotes.length > 0 && (
        <div className="space-y-2 pt-1">
          {record.privateNotes.map((note) => (
            <NoteRow key={note.id} note={note} recordId={record.id} onUpdated={onUpdated} />
          ))}
        </div>
      )}

      {/* 삭제 확인 다이얼로그 */}
      {confirmDelete && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3 space-y-2">
          <p className="text-sm text-destructive font-medium">
            비공개 메모 {confirmDelete.noteCount}건이 함께 삭제됩니다. 계속할까요?
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => { setConfirmDelete(null); deleteRecord(true); }}
              disabled={deleting}
              className="flex items-center gap-1.5 rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-white hover:bg-destructive/90 disabled:opacity-50 transition-colors"
            >
              <Trash weight="bold" className="h-3.5 w-3.5" />
              삭제 확정
            </button>
            <button
              type="button"
              onClick={() => setConfirmDelete(null)}
              className="rounded-md border px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {error && !editingShared && !confirmDelete && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}

// ─── 새 심방기록 작성 폼 ──────────────────────────────────────────────────────

function AddRecordForm({ onAdded }: { onAdded: () => void }) {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const [open, setOpen] = useState(false);
  const [memberId, setMemberId] = useState("");
  const [visitedAt, setVisitedAt] = useState(todayIso());
  const [sharedContent, setSharedContent] = useState("");
  const [privateNote, setPrivateNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const active = [...members]
    .filter((m) => m.memberStatus === "활동")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) { setError("대상 교인을 선택하세요."); return; }
    if (!sharedContent.trim() && !privateNote.trim()) {
      setError("공유 심방기록 또는 비공개 메모 중 하나는 입력해야 합니다.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/pastoral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, visitedAt, sharedContent, privateNote }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "저장 실패");
        return;
      }
      setOpen(false);
      setMemberId("");
      setVisitedAt(todayIso());
      setSharedContent("");
      setPrivateNote("");
      onAdded();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mb-6">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border bg-background px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
      >
        {open ? <CaretUp weight="bold" className="h-4 w-4" /> : <Plus weight="bold" className="h-4 w-4" />}
        심방기록 추가
        {open ? <CaretUp weight="light" className="h-3 w-3 ml-1 text-muted-foreground" /> : null}
      </button>

      {open && (
        <form
          onSubmit={submit}
          className="mt-3 rounded-lg border bg-card p-4 space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">대상 교인</label>
              <select
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                required
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <option value="">교인 선택</option>
                {active.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">심방일</label>
              <input
                type="date"
                value={visitedAt}
                onChange={(e) => setVisitedAt(e.target.value)}
                className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">공유 심방기록</label>
            <p className="text-xs text-muted-foreground">관리자·목사님·장로님·집사님이 열람할 수 있습니다.</p>
            <textarea
              value={sharedContent}
              onChange={(e) => setSharedContent(e.target.value)}
              rows={4}
              placeholder="심방 내용을 입력하세요 (선택)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">비공개 심방메모 (선택)</label>
            <p className="text-xs text-muted-foreground">작성자 본인·담임목사님·관리자만 열람할 수 있습니다.</p>
            <textarea
              value={privateNote}
              onChange={(e) => setPrivateNote(e.target.value)}
              rows={3}
              placeholder="비공개 메모를 입력하세요 (선택)"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Check weight="bold" className="h-3.5 w-3.5" />
              {saving ? "저장 중..." : "저장"}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="flex items-center gap-1.5 rounded-md border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <X weight="bold" className="h-3.5 w-3.5" />
              취소
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

// ─── 메인 페이지 ────────────────────────────────────────────────────────────

export default function PastoralListPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  // authInfo를 useSyncExternalStore로 구독
  const authInfo = useSyncExternalStore(subscribeAuth, getAuthInfo, getAuthInfo);

  const [authLoading, setAuthLoading] = useState(true);
  const [records, setRecords] = useState<PastoralRecord[]>([]);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  // mount 시 authInfo 로드
  useEffect(() => {
    loadAuthInfo().finally(() => setAuthLoading(false));
  }, []);

  const canView = !authLoading && hasViewPermission();

  const fetchRecords = useCallback(async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const res = await fetch("/api/pastoral", { cache: "no-store" });
      if (res.status === 403) {
        setDataError("forbidden");
        return;
      }
      if (!res.ok) {
        setDataError("fetch-error");
        return;
      }
      const data = await res.json() as { records: PastoralRecord[] };
      setRecords(data.records ?? []);
    } catch {
      setDataError("fetch-error");
    } finally {
      setDataLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canView) fetchRecords();
  }, [canView, fetchRecords]);

  // 멤버 이름 조회 헬퍼
  const memberName = useCallback((memberId: string): string => {
    const m = members.find((x) => x.id === memberId);
    return m?.name ?? memberId;
  }, [members]);

  // 월별 그룹핑
  const grouped = new Map<string, PastoralRecord[]>();
  for (const r of records) {
    const key = monthLabel(r.visitedAt ?? r.createdAt.slice(0, 10));
    const existing = grouped.get(key);
    if (existing) existing.push(r);
    else grouped.set(key, [r]);
  }

  // ── 로딩 중 ──
  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <p className="text-sm text-muted-foreground">권한 확인 중...</p>
      </div>
    );
  }

  // ── 권한 없음 ──
  if (!authInfo?.authenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm text-center space-y-3">
          <Link href="/" className="inline-block mb-2">
            <Cross weight="fill" className="h-8 w-8 text-primary mx-auto" />
          </Link>
          <h1 className="text-lg font-semibold">심방 목록</h1>
          <p className="text-sm text-muted-foreground">로그인이 필요합니다.</p>
          <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  if (!canView) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm text-center space-y-3">
          <Link href="/" className="inline-block mb-2">
            <Cross weight="fill" className="h-8 w-8 text-primary mx-auto" />
          </Link>
          <h1 className="text-lg font-semibold">심방 목록</h1>
          <p className="text-sm text-muted-foreground">심방기록 열람 권한이 없습니다.</p>
          <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
            돌아가기
          </Link>
        </div>
      </div>
    );
  }

  // ── 메인 목록 ──
  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-12 max-w-3xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <Link
            href="/members"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft weight="light" className="h-4 w-4" />
            목록
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">심방 목록</h1>
          {!dataLoading && (
            <span className="text-sm text-muted-foreground">총 {records.length}건</span>
          )}
        </div>

        {/* 새 기록 추가 폼 */}
        <AddRecordForm onAdded={fetchRecords} />

        {/* 로딩 */}
        {dataLoading && (
          <div className="py-12 text-center text-sm text-muted-foreground">불러오는 중...</div>
        )}

        {/* 에러 */}
        {!dataLoading && dataError === "forbidden" && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            서버에서 열람 권한이 없다고 응답했습니다.
          </div>
        )}
        {!dataLoading && dataError === "fetch-error" && (
          <div className="py-12 text-center text-sm text-destructive">
            데이터를 불러오지 못했습니다.{" "}
            <button type="button" onClick={fetchRecords} className="underline hover:text-destructive/80">
              다시 시도
            </button>
          </div>
        )}

        {/* 기록 목록 */}
        {!dataLoading && !dataError && records.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">심방 기록이 없습니다.</div>
        )}

        {!dataLoading && !dataError && records.length > 0 && (
          <div className="space-y-8">
            {Array.from(grouped.entries()).map(([month, recs]) => (
              <div key={month}>
                {/* 월 구분선 */}
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">{month}</span>
                  <span className="text-xs text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
                    {recs.length}건
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>

                <div className="space-y-3">
                  {recs.map((record) => (
                    <RecordCard
                      key={record.id}
                      record={record}
                      memberName={memberName(record.memberId)}
                      onUpdated={fetchRecords}
                      onDeleted={fetchRecords}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
