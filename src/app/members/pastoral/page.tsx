"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cross, ArrowLeft, Printer, TextAa, X } from "@phosphor-icons/react";
import { getMembers, subscribe } from "@/lib/member-store";
import type { Member } from "@/types";

const SIZE_OPTIONS = [
  { label: "중", nameClass: "text-xl", contentClass: "text-base", numClass: "text-base", py: "py-4" },
  { label: "대", nameClass: "text-2xl", contentClass: "text-lg", numClass: "text-lg", py: "py-5" },
  { label: "특대", nameClass: "text-3xl", contentClass: "text-xl", numClass: "text-xl", py: "py-6" },
];

type SizeOption = (typeof SIZE_OPTIONS)[number];

function VisitModal({ member, size, onClose }: { member: Member; size: SizeOption; onClose: () => void }) {
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
                      <p className={`${size.contentClass} text-foreground/80`}>{visit.content}</p>
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
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const size = SIZE_OPTIONS[sizeIdx] ?? SIZE_OPTIONS[1];

  const selectedMember = selectedMemberId
    ? members.find((m) => m.id === selectedMemberId) ?? null
    : null;

  const active = [...members]
    .filter((m) => m.memberStatus === "활동")
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background no-print">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
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
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-lg border p-1">
              <TextAa weight="light" className="h-4 w-4 text-muted-foreground ml-1" />
              {SIZE_OPTIONS.map((opt, i) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setSizeIdx(i)}
                  className={`rounded px-3 py-2 text-sm font-medium transition-colors ${
                    sizeIdx === i
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="flex items-center gap-1.5 rounded-md border px-3 py-2 text-sm hover:bg-secondary transition-colors"
            >
              <Printer weight="light" className="h-4 w-4" />
              인쇄
            </button>
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
              <div key={member.id} className={`flex gap-4 ${size?.py ?? "py-5"}`}>
                <span
                  className={`${size?.numClass ?? "text-lg"} w-9 shrink-0 text-right font-mono text-muted-foreground/50 pt-0.5`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <Link
                      href={`/members/${member.id}`}
                      className={`${size?.nameClass ?? "text-2xl"} font-bold leading-snug hover:text-primary transition-colors`}
                    >
                      {member.name}
                    </Link>
                    {member.position && member.position !== "성도" && (
                      <span className={`${size?.contentClass ?? "text-lg"} text-muted-foreground`}>
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
                      className={`${size?.contentClass ?? "text-lg"} mt-1.5 text-left leading-relaxed text-foreground/80 hover:text-primary transition-colors cursor-pointer`}
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
                      className={`${size?.contentClass ?? "text-lg"} mt-1.5 text-muted-foreground/40 italic hover:text-muted-foreground transition-colors cursor-pointer`}
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

      {selectedMember && size && (
        <VisitModal member={selectedMember} size={size} onClose={() => setSelectedMemberId(null)} />
      )}
    </div>
  );
}
