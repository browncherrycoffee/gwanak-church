"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cross, ArrowLeft, Printer, TextAa, X } from "@phosphor-icons/react";
import { getMembers, subscribe } from "@/lib/member-store";
import type { Member } from "@/types";

const SIZE_LABELS = ["중", "대", "특대", "최대"] as const;

// 정적 클래스명 반환 — Tailwind가 각 문자열을 확실히 번들에 포함
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

function PrayerModal({ member, sizeIdx, onClose }: { member: Member; sizeIdx: number; onClose: () => void }) {
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
            <span className="ml-2 text-sm text-muted-foreground">기도제목 {sorted.length}건</span>
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
                    <div key={req.id} className="leading-relaxed">
                      <p className={`${getPrayerClass(sizeIdx)} text-foreground/80`}>{req.content}</p>
                      {/^\d{4}-\d{2}-\d{2}/.test(req.createdAt) && (
                        <p className="text-xs text-muted-foreground/50 mt-0.5">
                          {req.createdAt.substring(0, 10)}
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

export default function PrayerListPage() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

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
          <h1 className="text-xl font-bold">기도 목록</h1>
          <span className="text-sm text-muted-foreground">
            활동 교인 {active.length}명 · 가나다순
          </span>
        </div>

        <div className="divide-y">
          {active.map((member, idx) => {
            const latestPrayer = [...member.prayerRequests].sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt)
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
                      <span className={`${getPrayerClass(sizeIdx)} text-muted-foreground`}>
                        {member.position}
                      </span>
                    )}
                  </div>
                  {latestPrayer ? (
                    <button
                      type="button"
                      onClick={() => setSelectedMemberId(member.id)}
                      className={`${getPrayerClass(sizeIdx)} mt-1.5 text-left leading-relaxed text-foreground/80 hover:text-primary transition-colors cursor-pointer`}
                    >
                      {latestPrayer.content}
                      {member.prayerRequests.length > 1 && (
                        <span className="ml-1.5 text-xs text-muted-foreground/50 font-normal">
                          +{member.prayerRequests.length - 1}
                        </span>
                      )}
                    </button>
                  ) : (
                    <p className={`${getPrayerClass(sizeIdx)} mt-1.5 text-muted-foreground/40 italic`}>
                      —
                    </p>
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
        <PrayerModal member={selectedMember} sizeIdx={sizeIdx} onClose={() => setSelectedMemberId(null)} />
      )}
    </div>
  );
}
