"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Cross,
  ArrowLeft,
  SortAscending,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MemberCard } from "@/components/members/member-card";
import { searchMembers } from "@/lib/search";
import { getMembers, subscribe } from "@/lib/member-store";
import { POSITION_ORDER } from "@/lib/constants";
import type { Member } from "@/types";

type SortKey = "name" | "position" | "registrationDate";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "이름순" },
  { value: "position", label: "직분순" },
  { value: "registrationDate", label: "등록일순" },
];

function sortMembers(members: Member[], key: SortKey): Member[] {
  return [...members].sort((a, b) => {
    switch (key) {
      case "name":
        return a.name.localeCompare(b.name, "ko");
      case "position": {
        const aIdx = POSITION_ORDER.indexOf(a.position ?? "");
        const bIdx = POSITION_ORDER.indexOf(b.position ?? "");
        return (aIdx === -1 ? 999 : aIdx) - (bIdx === -1 ? 999 : bIdx);
      }
      case "registrationDate":
        return (a.registrationDate ?? "").localeCompare(b.registrationDate ?? "");
      default:
        return 0;
    }
  });
}

export default function WithdrawnMembersPage() {
  const [query, setQuery] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("name");

  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const withdrawn = useMemo(
    () => members.filter((m) => m.memberStatus === "제적"),
    [members],
  );

  const filtered = useMemo(() => {
    const result = query ? searchMembers(withdrawn, query) : withdrawn;
    return query ? result : sortMembers(result, sortKey);
  }, [withdrawn, query, sortKey]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <Link
            href="/members"
            className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft weight="light" className="h-4 w-4" />
            교인 목록
          </Link>
          {/* 데스크탑: 검색창 인라인 */}
          <div className="relative hidden sm:flex flex-1 max-w-2xl">
            <MagnifyingGlass
              weight="light"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="제적 교인 검색..."
              className="h-10 rounded-full pl-10 pr-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        {/* 모바일: 검색창 별도 행 */}
        <div className="sm:hidden px-4 pb-3">
          <div className="relative">
            <MagnifyingGlass
              weight="light"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="제적 교인 검색..."
              className="h-10 rounded-full pl-10 pr-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">제적 교인</h1>
            <Badge variant="secondary">{filtered.length}명</Badge>
            {filtered.length !== withdrawn.length && (
              <span className="text-xs text-muted-foreground">
                (전체 {withdrawn.length}명 중)
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <SortAscending weight="light" className="h-3.5 w-3.5" />
            <select
              className="border-none bg-transparent text-xs text-muted-foreground focus:outline-none cursor-pointer"
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MagnifyingGlass weight="thin" className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">
              {withdrawn.length === 0 ? "제적 교인이 없습니다" : "검색 결과가 없습니다"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
