"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cross, ArrowLeft, Printer, TextAa } from "@phosphor-icons/react";
import { getMembers, subscribe } from "@/lib/member-store";

const SIZE_OPTIONS = [
  { label: "중", nameClass: "text-xl", prayerClass: "text-base", numClass: "text-base", py: "py-4" },
  { label: "대", nameClass: "text-2xl", prayerClass: "text-lg", numClass: "text-lg", py: "py-5" },
  { label: "특대", nameClass: "text-3xl", prayerClass: "text-xl", numClass: "text-xl", py: "py-6" },
];

export default function PrayerListPage() {
  const [sizeIdx, setSizeIdx] = useState(1);
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const size = SIZE_OPTIONS[sizeIdx] ?? SIZE_OPTIONS[1];

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
              <div key={member.id} className={`flex gap-4 ${size?.py ?? "py-5"}`}>
                <span
                  className={`${size?.numClass ?? "text-lg"} w-9 shrink-0 text-right font-mono text-muted-foreground/50 pt-0.5`}
                >
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className={`${size?.nameClass ?? "text-2xl"} font-bold leading-snug`}>
                      {member.name}
                    </span>
                    {member.position && member.position !== "성도" && (
                      <span className={`${size?.prayerClass ?? "text-lg"} text-muted-foreground`}>
                        {member.position}
                      </span>
                    )}
                  </div>
                  {latestPrayer ? (
                    <p className={`${size?.prayerClass ?? "text-lg"} mt-1.5 leading-relaxed text-foreground/80`}>
                      {latestPrayer.content}
                    </p>
                  ) : (
                    <p className={`${size?.prayerClass ?? "text-lg"} mt-1.5 text-muted-foreground/40 italic`}>
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
    </div>
  );
}
