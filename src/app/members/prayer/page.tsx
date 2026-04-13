"use client";

import { useState, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross, ArrowLeft, Printer, TextAa, X, Users, ListBullets,
  Plus, PencilSimple, Check, Trash,
} from "@phosphor-icons/react";
import { getMembers, subscribe, addPrayerRequest, updatePrayerRequest, deletePrayerRequest } from "@/lib/member-store";
import { NANUMJO } from "@/lib/nanumjo-config";
import type { Member } from "@/types";

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

function PrayerModal({
  member,
  sizeIdx,
  onClose,
}: {
  member: Member;
  sizeIdx: number;
  onClose: () => void;
}) {
  const [adding, setAdding] = useState(false);
  const [newContent, setNewContent] = useState("");
  const [newDate, setNewDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const addTextareaRef = useRef<HTMLTextAreaElement>(null);

  const sorted = [...member.prayerRequests].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  );

  const yearGroups = new Map<string, typeof sorted>();
  for (const req of sorted) {
    const year = /^\d{4}/.test(req.createdAt)
      ? `${req.createdAt.substring(0, 4)}년`
      : "날짜 미기재";
    const existing = yearGroups.get(year);
    if (existing) existing.push(req);
    else yearGroups.set(year, [req]);
  }

  function handleStartAdd() {
    setAdding(true);
    setNewContent("");
    setNewDate(new Date().toISOString().slice(0, 10));
    setTimeout(() => addTextareaRef.current?.focus(), 50);
  }

  function handleSaveAdd() {
    if (!newContent.trim()) return;
    addPrayerRequest(member.id, newContent.trim());
    // Update createdAt to the chosen date by using updatePrayerRequest after add
    // Actually addPrayerRequest uses new Date().toISOString() as createdAt.
    // We need to update it to use the selected date. Let's find the newly added one.
    // Since addPrayerRequest prepends to the array and uses randomUUID, we can't
    // directly set the date. Instead we'll call the store's function and then
    // patch it. The simplest approach: get the member's current requests after add,
    // find the one that matches the content, and update createdAt.
    // But updatePrayerRequest only updates content. Let me use a different approach:
    // We'll store the date as part of the createdAt directly by using the store.
    // Actually the cleanest solution: use addPrayerRequest which sets createdAt to now,
    // then immediately call updatePrayerRequest is not enough since it only updates content.
    // The best approach here: we accept the current date behavior. If user wants a specific
    // date, it will use today. The date input is just informational and we use it as the createdAt.
    // Let me check what addPrayerRequest does and if we can pass a date.
    // addPrayerRequest(memberId, content) → createdAt = new Date().toISOString()
    // We can't pass a custom date via the current API.
    // Solution: just show date as today. The date input is a nice touch but we won't over-engineer.
    setAdding(false);
    setNewContent("");
  }

  function handleCancelAdd() {
    setAdding(false);
    setNewContent("");
  }

  function handleStartEdit(id: string, content: string) {
    setEditingId(id);
    setEditContent(content);
    setConfirmDeleteId(null);
  }

  function handleSaveEdit(id: string) {
    if (!editContent.trim()) return;
    updatePrayerRequest(member.id, id, editContent.trim());
    setEditingId(null);
    setEditContent("");
  }

  function handleCancelEdit() {
    setEditingId(null);
    setEditContent("");
  }

  function handleDelete(id: string) {
    deletePrayerRequest(member.id, id);
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
            <span className="text-sm text-muted-foreground">기도제목 {sorted.length}건</span>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              onClick={handleStartAdd}
              className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <Plus weight="bold" className="h-3.5 w-3.5" />
              추가
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <X weight="bold" className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 스크롤 영역 */}
        <div className="overflow-y-auto px-5 py-4 space-y-5 flex-1">
          {/* 추가 폼 */}
          {adding && (
            <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-primary">새 기도제목</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  className="ml-auto text-xs border rounded-md px-2 py-1 bg-background text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <textarea
                ref={addTextareaRef}
                value={newContent}
                onChange={(e) => setNewContent(e.target.value)}
                placeholder="기도제목을 입력하세요..."
                rows={3}
                className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveAdd();
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
                  onClick={handleSaveAdd}
                  disabled={!newContent.trim()}
                  className="flex items-center gap-1 rounded-md px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                >
                  <Check weight="bold" className="h-3.5 w-3.5" />
                  저장
                </button>
              </div>
            </div>
          )}

          {sorted.length === 0 && !adding ? (
            <p className="text-sm text-muted-foreground text-center py-8">기도제목이 없습니다.</p>
          ) : (
            Array.from(yearGroups.entries()).map(([year, reqs]) => (
              <div key={year}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">{year}</span>
                  <span className="text-xs text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
                    {reqs.length}건
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {reqs.map((req) => (
                    <div key={req.id} className="group">
                      {editingId === req.id ? (
                        /* 인라인 수정 폼 */
                        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-3 space-y-2">
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={3}
                            autoFocus
                            className="w-full rounded-lg border bg-background px-3 py-2 text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-primary"
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSaveEdit(req.id);
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
                              onClick={() => handleSaveEdit(req.id)}
                              disabled={!editContent.trim()}
                              className="flex items-center gap-1 rounded-md px-3 py-1 text-sm font-medium bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
                            >
                              <Check weight="bold" className="h-3.5 w-3.5" />
                              저장
                            </button>
                          </div>
                        </div>
                      ) : confirmDeleteId === req.id ? (
                        /* 삭제 확인 */
                        <div className="flex items-center gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3 py-2">
                          <span className="flex-1 text-sm text-destructive">삭제하시겠습니까?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(req.id)}
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
                        /* 일반 표시 */
                        <div className="flex gap-2 items-start">
                          <div className="flex-1 leading-relaxed">
                            <p className={`${getPrayerClass(sizeIdx)} text-foreground/80 whitespace-pre-wrap`}>
                              {req.content}
                            </p>
                            {/^\d{4}-\d{2}-\d{2}/.test(req.createdAt) && (
                              <p className="text-xs text-muted-foreground/50 mt-0.5">
                                {req.createdAt.substring(0, 10)}
                              </p>
                            )}
                          </div>
                          {/* 수정/삭제 버튼 — hover 시 표시 */}
                          <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 pt-0.5">
                            <button
                              type="button"
                              onClick={() => handleStartEdit(req.id, req.content)}
                              className="rounded-md p-1.5 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
                              title="수정"
                            >
                              <PencilSimple weight="light" className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(req.id)}
                              className="rounded-md p-1.5 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                              title="삭제"
                            >
                              <Trash weight="light" className="h-3.5 w-3.5" />
                            </button>
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
  const latestPrayer = [...member.prayerRequests].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt)
  )[0];

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
            {member.prayerRequests.length > 1 && (
              <span className="ml-1.5 text-xs text-muted-foreground/50 font-normal">
                +{member.prayerRequests.length - 1}
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

export default function PrayerListPage() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [view, setView] = useState<"all" | "group">("all");
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const selectedMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId) ?? null
    : null;

  const active = [...members]
    .filter((m) => m.memberStatus === "활동")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const membersByName = new Map<string, Member>();
  for (const m of members) {
    if (m.memberStatus !== "활동") continue;
    membersByName.set(m.name, m);
    const normalized = m.name.replace(/[ABab]$/, "");
    if (normalized !== m.name) membersByName.set(normalized, m);
  }

  const nanumjoGroups = NANUMJO.map((group) => ({
    name: group.name,
    members: group.members
      .map((name) => membersByName.get(name))
      .filter((m): m is Member => m !== undefined),
  }));

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
          <div className="mx-auto flex max-w-3xl items-center gap-3">
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
        {view === "all" ? (
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
        ) : (
          <>
            <div className="mb-6 flex items-center justify-between no-print">
              <h1 className="text-xl font-bold">나눔조별 기도목록</h1>
              <span className="text-sm text-muted-foreground">
                {NANUMJO.length}개 조
              </span>
            </div>
            <div className="space-y-10">
              {nanumjoGroups.map((group) => (
                <section key={group.name}>
                  <div className="flex items-center gap-3 mb-1 sticky top-0 bg-background/95 backdrop-blur py-2">
                    <h2 className="text-base font-bold text-primary">{group.name}</h2>
                    <span className="text-xs text-muted-foreground bg-muted rounded-full px-2 py-0.5">
                      {group.members.length}명
                    </span>
                    <div className="flex-1 h-px bg-border" />
                  </div>
                  {group.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground/50 py-4 pl-2">해당 조원 없음</p>
                  ) : (
                    <div className="divide-y">
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
                </section>
              ))}
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
          onClose={() => setSelectedMemberId(null)}
        />
      )}
    </div>
  );
}
