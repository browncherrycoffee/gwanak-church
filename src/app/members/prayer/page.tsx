"use client";

import { useState, useRef, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross, ArrowLeft, Printer, TextAa, X, Users, ListBullets,
  Plus, PencilSimple, Check, Trash, Buildings,
} from "@phosphor-icons/react";
import {
  getMembers, subscribe, updateMember,
  getAuthInfo, loadAuthInfo, subscribeAuth,
} from "@/lib/member-store";
import type { AuthInfo } from "@/lib/member-store";
import {
  getPrayers, subscribePrayers, loadPrayers,
  getPrayersByMember, addPrayer, updatePrayer, deletePrayer,
} from "@/lib/prayer-store";
import type { PrayerItem } from "@/lib/prayer-store";
import { NANUMJO_NAMES } from "@/lib/nanumjo-config";
import { DEPARTMENTS } from "@/lib/constants";
import type { Member } from "@/types";

// ─── 색상 ────────────────────────────────────────────────────────────────────
const GROUP_COLORS = [
  { section: "border-rose-200 bg-rose-50/60", header: "bg-rose-100/80", title: "text-rose-800", chip: "bg-rose-100 text-rose-800 border-rose-200", chipActive: "bg-rose-600 text-white border-rose-600" },
  { section: "border-amber-200 bg-amber-50/60", header: "bg-amber-100/80", title: "text-amber-800", chip: "bg-amber-100 text-amber-800 border-amber-200", chipActive: "bg-amber-600 text-white border-amber-600" },
  { section: "border-emerald-200 bg-emerald-50/60", header: "bg-emerald-100/80", title: "text-emerald-800", chip: "bg-emerald-100 text-emerald-800 border-emerald-200", chipActive: "bg-emerald-600 text-white border-emerald-600" },
  { section: "border-sky-200 bg-sky-50/60", header: "bg-sky-100/80", title: "text-sky-800", chip: "bg-sky-100 text-sky-800 border-sky-200", chipActive: "bg-sky-600 text-white border-sky-600" },
  { section: "border-violet-200 bg-violet-50/60", header: "bg-violet-100/80", title: "text-violet-800", chip: "bg-violet-100 text-violet-800 border-violet-200", chipActive: "bg-violet-600 text-white border-violet-600" },
  { section: "border-orange-200 bg-orange-50/60", header: "bg-orange-100/80", title: "text-orange-800", chip: "bg-orange-100 text-orange-800 border-orange-200", chipActive: "bg-orange-600 text-white border-orange-600" },
  { section: "border-teal-200 bg-teal-50/60", header: "bg-teal-100/80", title: "text-teal-800", chip: "bg-teal-100 text-teal-800 border-teal-200", chipActive: "bg-teal-600 text-white border-teal-600" },
  { section: "border-indigo-200 bg-indigo-50/60", header: "bg-indigo-100/80", title: "text-indigo-800", chip: "bg-indigo-100 text-indigo-800 border-indigo-200", chipActive: "bg-indigo-600 text-white border-indigo-600" },
] as const;

const UNASSIGNED_COLOR = {
  section: "border-slate-200 bg-slate-50/60",
  header: "bg-slate-100/80",
  title: "text-slate-700",
  chip: "bg-slate-100 text-slate-700 border-slate-200",
  chipActive: "bg-slate-600 text-white border-slate-600",
} as const;

function getGroupColor(groupIdx: number, isUnassigned: boolean) {
  if (isUnassigned) return UNASSIGNED_COLOR;
  return GROUP_COLORS[groupIdx % GROUP_COLORS.length] ?? UNASSIGNED_COLOR;
}

// ─── 글자 크기 ───────────────────────────────────────────────────────────────
const SIZE_LABELS = ["중", "대", "특대", "최대"] as const;

function getNameClass(i: number) {
  if (i === 0) return "text-xl";
  if (i === 1) return "text-2xl";
  if (i === 2) return "text-3xl";
  return "text-5xl";
}
function getPrayerClass(i: number) {
  if (i === 0) return "text-base";
  if (i === 1) return "text-lg";
  if (i === 2) return "text-xl";
  return "text-2xl";
}
function getNumClass(i: number) {
  if (i === 0) return "text-base";
  if (i === 1) return "text-lg";
  if (i === 2) return "text-xl";
  return "text-2xl";
}
function getPyClass(i: number) {
  if (i === 0) return "py-4";
  if (i === 1) return "py-5";
  if (i === 2) return "py-6";
  return "py-8";
}

// ─── 권한 헬퍼 ───────────────────────────────────────────────────────────────
function canSeeFull(auth: AuthInfo | null): boolean {
  if (!auth) return false;
  return !!(auth.isAdmin || auth.roleGrade === "목사" || auth.roleGrade === "장로" || auth.roleGrade === "행정지원");
}

function canAddForMember(auth: AuthInfo | null, member: Member): boolean {
  if (!auth) return false;
  if (auth.isAdmin || auth.roleGrade === "목사" || auth.prayerScope === "all") return true;
  const assignments = auth.assignments ?? [];
  if (member.nanumjo && assignments.some((a) => a.unitType === "nanumjo" && a.unitName === member.nanumjo)) return true;
  for (const dept of (member.departments ?? [])) {
    if (assignments.some((a) => a.unitType === "department" && a.unitName === dept)) return true;
  }
  return false;
}

// ─── 기도제목 모달 ────────────────────────────────────────────────────────────
function PrayerModal({
  member,
  sizeIdx,
  auth,
  onClose,
}: {
  member: Member;
  sizeIdx: number;
  auth: AuthInfo | null;
  onClose: () => void;
}) {
  const prayers = useSyncExternalStore(subscribePrayers, getPrayers, getPrayers);
  const memberPrayers = prayers
    .filter((p) => p.memberId === member.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const addTextareaRef = useRef<HTMLTextAreaElement>(null);

  const showAdd = canAddForMember(auth, member);

  // 연도별 그룹
  const yearGroups = new Map<string, PrayerItem[]>();
  for (const item of memberPrayers) {
    const year = /^\d{4}/.test(item.createdAt)
      ? `${item.createdAt.substring(0, 4)}년`
      : "날짜 미기재";
    const existing = yearGroups.get(year);
    if (existing) existing.push(item);
    else yearGroups.set(year, [item]);
  }

  function handleStartAdd() {
    setAdding(true);
    setNewContent("");
    setErrorMsg(null);
    setTimeout(() => addTextareaRef.current?.focus(), 50);
  }

  async function handleSaveAdd() {
    if (!newContent.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    const result = await addPrayer(member.id, newContent.trim());
    setSaving(false);
    if (!result.ok) {
      setErrorMsg(result.error ?? "저장 실패");
      return;
    }
    setAdding(false);
    setNewContent("");
  }

  function handleCancelAdd() {
    setAdding(false);
    setNewContent("");
    setErrorMsg(null);
  }

  function handleStartEdit(id: string, content: string) {
    setEditingId(id);
    setEditContent(content);
    setConfirmDeleteId(null);
    setErrorMsg(null);
  }

  async function handleSaveEdit(id: string) {
    if (!editContent.trim()) return;
    setSaving(true);
    setErrorMsg(null);
    const result = await updatePrayer(id, editContent.trim());
    setSaving(false);
    if (!result.ok) {
      setErrorMsg(result.error ?? "수정 실패");
      return;
    }
    setEditingId(null);
    setEditContent("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditContent("");
    setErrorMsg(null);
  }

  async function handleDelete(id: string) {
    setSaving(true);
    setErrorMsg(null);
    const result = await deletePrayer(id);
    setSaving(false);
    if (!result.ok) {
      setErrorMsg(result.error ?? "삭제 실패");
    }
    setConfirmDeleteId(null);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[90vh] flex flex-col bg-background rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/members/${member.id}`}
              className="font-bold text-lg hover:text-primary transition-colors"
              onClick={onClose}
            >
              {member.name}
            </Link>
            {member.position && member.position !== "성도" && (
              <span className="text-sm text-muted-foreground">{member.position}</span>
            )}
            <span className="text-sm text-muted-foreground">기도제목 {memberPrayers.length}건</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {showAdd && (
              <button
                type="button"
                onClick={handleStartAdd}
                disabled={saving}
                className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-60"
              >
                <Plus weight="bold" className="h-3.5 w-3.5" />
                추가
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 오류 메시지 */}
        {errorMsg && (
          <div className="mx-5 mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2 text-sm text-destructive shrink-0">
            {errorMsg}
          </div>
        )}

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">
          {/* 추가 폼 */}
          {adding && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <label className="text-xs font-semibold text-primary">새 기도제목</label>
              <textarea
                ref={addTextareaRef}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="기도제목을 입력하세요..."
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSaveAdd();
                  if (e.key === "Escape") handleCancelAdd();
                }}
              />
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={handleCancelAdd}
                  className="rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                >
                  취소
                </button>
                <button
                  type="button"
                  onClick={() => void handleSaveAdd()}
                  disabled={!newContent.trim() || saving}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Check weight="bold" className="h-3.5 w-3.5" />
                  저장
                </button>
              </div>
            </div>
          )}

          {memberPrayers.length === 0 && !adding ? (
            <p className="text-sm text-muted-foreground text-center py-8">기도제목이 없습니다.</p>
          ) : (
            Array.from(yearGroups.entries()).map(([year, items]) => (
              <div key={year}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">{year}</span>
                  <span className="text-xs text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
                    {items.length}건
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {items.map((item) => (
                    <div key={item.id} className="group">
                      {editingId === item.id ? (
                        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) void handleSaveEdit(item.id);
                              if (e.key === "Escape") handleCancelEdit();
                            }}
                          />
                          <div className="flex gap-2 justify-end">
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="rounded-md px-3 py-1 text-sm text-muted-foreground hover:bg-secondary transition-colors"
                            >
                              취소
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleSaveEdit(item.id)}
                              disabled={!editContent.trim() || saving}
                              className="flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                            >
                              <Check weight="bold" className="h-3.5 w-3.5" />
                              저장
                            </button>
                          </div>
                        </div>
                      ) : confirmDeleteId === item.id ? (
                        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                          <span className="flex-1 text-sm text-destructive">삭제하시겠습니까?</span>
                          <button
                            type="button"
                            onClick={() => void handleDelete(item.id)}
                            className="rounded-md px-3 py-1 text-xs font-medium bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                          >
                            삭제
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            취소
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 items-start">
                          <div className="flex-1 leading-relaxed">
                            <p className={`${getPrayerClass(sizeIdx)} text-foreground/80 whitespace-pre-wrap`}>
                              {item.content}
                            </p>
                            <p className="text-xs text-muted-foreground/50 mt-0.5 flex items-center gap-1.5">
                              {/^\d{4}-\d{2}-\d{2}/.test(item.createdAt) && (
                                <span>{item.createdAt.substring(0, 10)}</span>
                              )}
                              <span>{item.authorName}</span>
                              {item.lastEditorName && item.lastEditorName !== item.authorName && (
                                <span>(수정: {item.lastEditorName})</span>
                              )}
                            </p>
                          </div>
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                            {item.canEdit && (
                              <button
                                type="button"
                                onClick={() => handleStartEdit(item.id, item.content)}
                                className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                                title="수정"
                              >
                                <PencilSimple weight="light" className="h-3.5 w-3.5" />
                              </button>
                            )}
                            {item.canDelete && (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                                title="삭제"
                              >
                                <Trash weight="light" className="h-3.5 w-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ─── 교인 행 ─────────────────────────────────────────────────────────────────
function MemberPrayerRow({
  member,
  idx,
  sizeIdx,
  onSelect,
  showNum = true,
}: {
  member: Member;
  idx: number;
  sizeIdx: number;
  onSelect: (id: string) => void;
  showNum?: boolean;
}) {
  const prayers = useSyncExternalStore(subscribePrayers, getPrayers, getPrayers);
  const memberPrayers = getPrayersByMember(member.id).sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );
  // subscribePrayers 구독 갱신을 위해 prayers 길이를 사용
  const prayerCount = prayers.filter((p) => p.memberId === member.id).length;
  const latestPrayer = memberPrayers[0];

  return (
    <div className={`flex gap-4 ${getPyClass(sizeIdx)}`}>
      {showNum && (
        <span
          className={`${getNumClass(sizeIdx)} w-9 shrink-0 text-right font-mono text-muted-foreground/50 pt-0.5`}
        >
          {idx + 1}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 flex-wrap">
          <Link
            href={`/members/${member.id}`}
            className={`${getNameClass(sizeIdx)} font-bold leading-snug hover:text-primary transition-colors`}
          >
            {member.name}
          </Link>
          {member.position && member.position !== "성도" && (
            <span className={`${getPrayerClass(sizeIdx)} text-muted-foreground`}>
              {member.position}
            </span>
          )}
        </div>
        {latestPrayer ? (
          <button
            type="button"
            onClick={() => onSelect(member.id)}
            className={`${getPrayerClass(sizeIdx)} mt-1.5 text-left leading-relaxed text-foreground/80 hover:text-primary transition-colors cursor-pointer whitespace-pre-wrap`}
          >
            {latestPrayer.content}
            {prayerCount > 1 && (
              <span className="ml-1.5 text-xs text-muted-foreground/50 font-normal">
                +{prayerCount - 1}
              </span>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onSelect(member.id)}
            className={`${getPrayerClass(sizeIdx)} mt-1.5 text-muted-foreground/40 italic hover:text-primary transition-colors`}
          >
            —
          </button>
        )}
      </div>
    </div>
  );
}

// ─── 메인 페이지 ─────────────────────────────────────────────────────────────
export default function PrayerListPage() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "group" | "dept">("all");
  const [addingGroup, setAddingGroup] = useState<string | null>(null);

  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const auth = useSyncExternalStore(subscribeAuth, getAuthInfo, getAuthInfo);

  // mount 시 권한·기도제목 로드
  useEffect(() => {
    void loadAuthInfo();
    void loadPrayers();
  }, []);

  // 15초 간격 기도제목 폴링 (화면이 보일 때만)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) void loadPrayers(true);
    }, 15_000);
    return () => clearInterval(interval);
  }, []);

  const selectedMember = selectedMemberId
    ? (members.find((m) => m.id === selectedMemberId) ?? null)
    : null;

  const active = [...members]
    .filter((m) => m.memberStatus === "활동")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const fullAccess = canSeeFull(auth);
  const assignments = auth?.assignments ?? [];

  // ─── 나눔조 그룹 ─────────────────────────────────────────────────────────
  const visibleNanumjoNames: string[] = fullAccess
    ? [...NANUMJO_NAMES]
    : NANUMJO_NAMES.filter((name) =>
        assignments.some((a) => a.unitType === "nanumjo" && a.unitName === name)
      );

  const nanumjoGroups: { name: string; isUnassigned: boolean; members: Member[] }[] =
    visibleNanumjoNames.map((name) => ({
      name,
      isUnassigned: false,
      members: active.filter((m) => m.nanumjo === name),
    }));

  // 미배정 섹션 — fullAccess일 때만
  if (fullAccess) {
    const unassigned = active.filter(
      (m) => !m.nanumjo || !NANUMJO_NAMES.includes(m.nanumjo as (typeof NANUMJO_NAMES)[number]),
    );
    if (unassigned.length > 0) {
      nanumjoGroups.push({ name: "미배정", isUnassigned: true, members: unassigned });
    }
  }

  // ─── 부서 그룹 ───────────────────────────────────────────────────────────
  const visibleDepts: string[] = fullAccess
    ? [...DEPARTMENTS]
    : DEPARTMENTS.filter((dept) =>
        assignments.some((a) => a.unitType === "department" && a.unitName === dept)
      );

  const deptGroups: { name: string; isUnassigned: boolean; members: Member[] }[] =
    visibleDepts.map((name) => ({
      name,
      isUnassigned: false,
      members: active.filter((m) => (m.departments ?? []).includes(name)),
    }));

  if (fullAccess) {
    const unassignedDept = active.filter(
      (m) => !m.departments || m.departments.length === 0,
    );
    if (unassignedDept.length > 0) {
      deptGroups.push({ name: "미배정", isUnassigned: true, members: unassignedDept });
    }
  }

  function scrollToGroup(name: string) {
    document.getElementById(`jo-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function scrollToDept(name: string) {
    document.getElementById(`dept-${name}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleAddToGroup(memberId: string, groupName: string) {
    updateMember(memberId, { nanumjo: groupName });
    setAddingGroup(null);
  }

  const currentGroups = view === "group" ? nanumjoGroups : deptGroups;
  const currentScrollFn = view === "group" ? scrollToGroup : scrollToDept;
  const currentIdPrefix = view === "group" ? "jo-" : "dept-";

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background no-print">
        <div className="mx-auto flex h-12 max-w-3xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
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
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary transition-colors"
          >
            <Printer weight="light" className="h-4 w-4" />
            인쇄
          </button>
        </div>
        <div className="border-t bg-muted/20 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-center gap-3 flex-wrap">
            {/* 보기 토글 */}
            <div className="flex items-center gap-1 rounded-lg border bg-background p-0.5">
              <button
                type="button"
                onClick={() => setView("all")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "all"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <ListBullets weight="light" className="h-4 w-4" />
                전교인
              </button>
              <button
                type="button"
                onClick={() => setView("group")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "group"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Users weight="light" className="h-4 w-4" />
                나눔조별
              </button>
              <button
                type="button"
                onClick={() => setView("dept")}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  view === "dept"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Buildings weight="light" className="h-4 w-4" />
                부서별
              </button>
            </div>
            <div className="h-5 w-px bg-border" />
            <TextAa weight="light" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex items-center gap-1">
              {SIZE_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSizeIdx(i)}
                  className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                    sizeIdx === i
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        {/* ─── 전교인 보기 ───────────────────────────────────────────────── */}
        {view === "all" && (
          <>
            <div className="mb-6 flex items-center justify-between no-print">
              <h1 className="text-xl font-bold">기도 목록</h1>
              <span className="text-sm text-muted-foreground">
                활동 교인 {active.length}명 · 가나다순
              </span>
            </div>
            <div className="divide-y">
              {active.map((member, idx) => (
                <MemberPrayerRow
                  key={member.id}
                  member={member}
                  idx={idx}
                  sizeIdx={sizeIdx}
                  onSelect={setSelectedMemberId}
                  showNum
                />
              ))}
            </div>
          </>
        )}

        {/* ─── 나눔조별 / 부서별 보기 ────────────────────────────────────── */}
        {(view === "group" || view === "dept") && (
          <>
            {/* 바로가기 — 상단 고정 */}
            <nav className="no-print sticky top-0 z-30 -mx-4 mb-5 border-b bg-background/95 px-4 py-2.5 backdrop-blur">
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {currentGroups.map((group, gi) => {
                  const color = getGroupColor(gi, group.isUnassigned);
                  return (
                    <button
                      key={group.name}
                      type="button"
                      onClick={() => currentScrollFn(group.name)}
                      className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors ${color.chip} hover:opacity-80`}
                    >
                      {group.name} {group.members.length}
                    </button>
                  );
                })}
              </div>
            </nav>

            <div className="mb-6 flex items-center justify-between no-print">
              <h1 className="text-xl font-bold">
                {view === "group" ? "나눔조별 기도목록" : "부서별 기도목록"}
              </h1>
              <span className="text-sm text-muted-foreground">
                {view === "group"
                  ? `${visibleNanumjoNames.length}개 조 · 활동 교인 ${active.length}명`
                  : `${visibleDepts.length}개 부서 · 활동 교인 ${active.length}명`}
              </span>
            </div>

            <div className="space-y-8">
              {currentGroups.map((group, gi) => {
                const color = getGroupColor(gi, group.isUnassigned);
                // 조원 추가 후보 (나눔조 보기에서만)
                const candidates = view === "group"
                  ? active.filter((m) => m.nanumjo !== group.name)
                  : [];
                return (
                  <section
                    key={group.name}
                    id={`${currentIdPrefix}${group.name}`}
                    className={`scroll-mt-16 overflow-hidden rounded-xl border-2 ${color.section}`}
                  >
                    {/* 그룹 헤더 */}
                    <div className={`flex items-center gap-3 px-4 py-3 ${color.header}`}>
                      <h2 className={`text-base font-bold ${color.title}`}>{group.name}</h2>
                      <span className={`text-xs font-semibold ${color.title} opacity-70`}>
                        {group.members.length}명
                      </span>
                      {/* 조원 추가 — 나눔조 보기 + 관리자만 */}
                      {view === "group" && !group.isUnassigned && auth?.isAdmin && (
                        <button
                          type="button"
                          onClick={() =>
                            setAddingGroup(addingGroup === group.name ? null : group.name)
                          }
                          className={`no-print ml-auto flex items-center gap-1 rounded-md border bg-background/80 px-2.5 py-1 text-xs font-medium ${color.title} hover:bg-background transition-colors`}
                        >
                          {addingGroup === group.name ? (
                            <>
                              <X weight="bold" className="h-3 w-3" />
                              닫기
                            </>
                          ) : (
                            <>
                              <Plus weight="bold" className="h-3 w-3" />
                              조원 추가
                            </>
                          )}
                        </button>
                      )}
                    </div>

                    {/* 조원 추가 패널 */}
                    {view === "group" && addingGroup === group.name && auth?.isAdmin && (
                      <div className="no-print border-b bg-background/70 px-4 py-3">
                        <label className="mb-1.5 block text-xs font-medium text-muted-foreground">
                          {group.name}에 추가할 교인 선택 (현재 소속조에서 이동됩니다)
                        </label>
                        <select
                          className="h-10 w-full rounded-md border bg-background px-3 py-2 text-sm sm:max-w-sm"
                          value=""
                          onChange={(e) => {
                            if (e.target.value) handleAddToGroup(e.target.value, group.name);
                          }}
                        >
                          <option value="">교인 선택...</option>
                          {candidates.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name}
                              {m.nanumjo ? ` (${m.nanumjo})` : " (미배정)"}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* 교인 목록 */}
                    <div className="px-4 pb-2">
                      {group.members.length === 0 ? (
                        <p className="py-4 pl-1 text-sm text-muted-foreground/60">해당 교인 없음</p>
                      ) : (
                        <div className="divide-y divide-border/60">
                          {group.members.map((member, idx) => (
                            <MemberPrayerRow
                              key={member.id}
                              member={member}
                              idx={idx}
                              sizeIdx={sizeIdx}
                              onSelect={setSelectedMemberId}
                              showNum={false}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                );
              })}
            </div>
          </>
        )}
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 13pt; }
        }
      `}</style>

      {selectedMember && (
        <PrayerModal
          member={selectedMember}
          sizeIdx={sizeIdx}
          auth={auth}
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  );
}
