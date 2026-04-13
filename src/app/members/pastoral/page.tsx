"use client";

import { useState, useSyncExternalStore, useEffect } from "react";
import Link from "next/link";
import { Cross, ArrowLeft, Printer, TextAa, X } from "@phosphor-icons/react";
import { getMembers, subscribe } from "@/lib/member-store";
import type { Member } from "@/types";
import { validatePastoralPin } from "@/lib/pastoral-auth";
import { Button } from "@/components/ui/button";

const SIZE_LABELS = ["중", "대", "특대", "최대"] as const;

// 정적 클래스명 반환 — Tailwind가 각 문자열을 확실히 번들에 포함
function getNameClass(i: number) {
  if (i === 0) return "text-xl";
  if (i === 1) return "text-2xl";
  if (i === 2) return "text-3xl";
  return "text-5xl";
}
function getContentClass(i: number) {
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

function VisitModal({ member, sizeIdx, onClose }: { member: Member; sizeIdx: number; onClose: () => void }) {
  const sorted = [...member.pastoralVisits].sort((a, b) =>
    b.visitedAt.localeCompare(a.visitedAt)
  );

  const yearGroups = new Map<string, typeof sorted>();
  for (const visit of sorted) {
    const year = /^\d{4}/.test(visit.visitedAt)
      ? `${visit.visitedAt.substring(0, 4)}년`
      : "날짜 미기재";
    const existing = yearGroups.get(year);
    if (existing) existing.push(visit);
    else yearGroups.set(year, [visit]);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-lg max-h-[85vh] flex flex-col bg-background rounded-t-2xl sm:rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div>
            <Link
              href={`/members/${member.id}`}
              className="font-bold text-lg hover:text-primary transition-colors"
              onClick={onClose}
            >
              {member.name}
            </Link>
            {member.position && member.position !== "성도" && (
              <span className="ml-2 text-sm text-muted-foreground">{member.position}</span>
            )}
            <span className="ml-2 text-sm text-muted-foreground">심방 {sorted.length}건</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-2 text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <X weight="bold" className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-5 py-4 space-y-6">
          {sorted.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">심방 기록이 없습니다.</p>
          ) : (
            Array.from(yearGroups.entries()).map(([year, visits]) => (
              <div key={year}>
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-xs font-semibold text-muted-foreground">{year}</span>
                  <span className="text-xs text-muted-foreground/60 bg-muted rounded-full px-2 py-0.5">
                    {visits.length}건
                  </span>
                  <div className="flex-1 h-px bg-border" />
                </div>
                <div className="space-y-3">
                  {visits.map((visit) => (
                    <div key={visit.id} className="leading-relaxed">
                      <p className={`${getContentClass(sizeIdx)} text-foreground/80 whitespace-pre-wrap`}>{visit.content}</p>
                      {/^\d{4}-\d{2}-\d{2}/.test(visit.visitedAt) && (
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          {visit.visitedAt}
                        </p>
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

export default function PastoralListPage() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  // BFCache(뒤로가기) 복원 시 강제 재인증
  useEffect(() => {
    const onPageShow = (e: PageTransitionEvent) => {
      if (e.persisted) {
        setUnlocked(false);
        setPin("");
        setPinError(false);
      }
    };
    window.addEventListener("pageshow", onPageShow);
    return () => window.removeEventListener("pageshow", onPageShow);
  }, []);

  if (!unlocked) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
          <div className="flex flex-col items-center text-center mb-6">
            <Link href="/" className="mb-4">
              <Cross weight="fill" className="h-8 w-8 text-primary" />
            </Link>
            <h1 className="text-lg font-semibold">심방 목록</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              심방 비밀번호를 입력하세요
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (validatePastoralPin(pin)) {
                setUnlocked(true);
              } else {
                setPinError(true);
                setPin("");
              }
            }}
            className="space-y-4"
          >
            <input
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => { setPin(e.target.value); setPinError(false); }}
              placeholder="심방 비밀번호"
              // biome-ignore lint/a11y/noAutofocus: intentional focus on single-field form
              autoFocus
              className="flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            {pinError && <p className="text-sm text-destructive">비밀번호가 올바르지 않습니다.</p>}
            <Button type="submit" className="w-full">확인</Button>
          </form>
          <div className="mt-4 text-center">
            <Link href="/members" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const selectedMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId) ?? null
    : null;

  const active = [...members]
    .filter((m) => m.memberStatus === "활동")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background no-print">
        {/* 1행: 네비게이션 */}
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
        {/* 2행: 글씨 크기 선택 — PC·모바일 모두 표시 */}
        <div className="border-t bg-muted/20 px-4 py-2">
          <div className="mx-auto flex max-w-3xl items-center gap-2">
            <TextAa weight="light" className="h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="hidden sm:inline text-xs text-muted-foreground">글씨 크기</span>
            <div className="flex items-center gap-1">
              {SIZE_LABELS.map((label, i) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setSizeIdx(i)}
                  className={`rounded-md px-3 py-2 text-sm font-medium transition-colors ${
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
        <div className="mb-6 flex items-center justify-between no-print">
          <h1 className="text-xl font-bold">심방 목록</h1>
          <span className="text-sm text-muted-foreground">
            활동 교인 {active.length}명 · 가나다순
          </span>
        </div>

        <div className="divide-y">
          {active.map((member, idx) => {
            const latestVisit = [...member.pastoralVisits].sort((a, b) =>
              b.visitedAt.localeCompare(a.visitedAt)
            )[0];
            return (
              <div key={member.id} className={`flex gap-4 ${getPyClass(sizeIdx)}`}>
                <span
                  className={`${getNumClass(sizeIdx)} w-9 shrink-0 text-right font-mono text-muted-foreground/50 pt-0.5`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link
                      href={`/members/${member.id}`}
                      className={`${getNameClass(sizeIdx)} font-bold leading-snug hover:text-primary transition-colors`}
                    >
                      {member.name}
                    </Link>
                    {member.position && member.position !== "성도" && (
                      <span className={`${getContentClass(sizeIdx)} text-muted-foreground`}>
                        {member.position}
                      </span>
                    )}
                    {latestVisit && (
                      <span className="text-xs text-muted-foreground/50">
                        {latestVisit.visitedAt}
                      </span>
                    )}
                  </div>
                  {latestVisit ? (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`${getContentClass(sizeIdx)} mt-1.5 text-left leading-relaxed text-foreground/80 hover:text-primary transition-colors cursor-pointer whitespace-pre-wrap`}
                    >
                      {latestVisit.content}
                      {member.pastoralVisits.length > 1 && (
                        <span className="ml-1.5 text-xs text-muted-foreground/50 font-normal">
                          +{member.pastoralVisits.length - 1}
                        </span>
                      )}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`${getContentClass(sizeIdx)} mt-1.5 text-muted-foreground/40 italic hover:text-muted-foreground transition-colors cursor-pointer`}
                    >
                      —
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { font-size: 13pt; }
        }
      `}</style>

      {selectedMember && (
        <VisitModal member={selectedMember} sizeIdx={sizeIdx} onClose={() => setSelectedMemberId(null)} />
      )}
    </div>
  );
}
