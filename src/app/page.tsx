"use client";

import { useState, useCallback, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Cross, MagnifyingGlass, Users, UserPlus } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { getMembers, subscribe } from "@/lib/member-store";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const activeCount = members.filter((m) => m.isActive).length;

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        handleSearch();
      }
    },
    [handleSearch],
  );

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      {/* 로고 및 교회 이름 */}
      <div className="mb-10 flex flex-col items-center gap-3">
        <Cross weight="fill" className="h-16 w-16 text-primary" />
        <h1 className="text-4xl font-bold tracking-tight text-primary md:text-5xl">
          관악교회
        </h1>
        <p className="text-muted-foreground">교적부 관리 시스템</p>
      </div>

      {/* 검색 바 */}
      <div className="w-full max-w-2xl">
        <div className="group relative">
          <MagnifyingGlass
            weight="light"
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors"
          />
          <Input
            type="text"
            placeholder="교인 이름, 연락처, 주소로 검색..."
            className="h-14 rounded-full border-2 pl-12 pr-4 text-lg shadow-sm focus:border-primary focus:shadow-md transition-shadow"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
        </div>

        <div className="mt-6 flex justify-center gap-3">
          <Button
            onClick={handleSearch}
            className="rounded-full px-6"
            disabled={!query.trim()}
          >
            <MagnifyingGlass weight="light" className="mr-2 h-4 w-4" />
            교적 검색
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full px-6"
          >
            <Link href="/members">
              <Users weight="light" className="mr-2 h-4 w-4" />
              전체 목록
            </Link>
          </Button>
        </div>
      </div>

      {/* 통계 */}
      <div className="mt-12 flex items-center gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-primary">{members.length}</p>
          <p className="text-xs text-muted-foreground">전체 교인</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-2xl font-bold text-primary">{activeCount}</p>
          <p className="text-xs text-muted-foreground">활동 교인</p>
        </div>
      </div>

      {/* 하단 바로가기 */}
      <div className="mt-10 flex gap-6 text-sm text-muted-foreground">
        <Link
          href="/members"
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <Users weight="light" className="h-4 w-4" />
          전체 교적
        </Link>
        <Link
          href="/members/new"
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <UserPlus weight="light" className="h-4 w-4" />
          교인 등록
        </Link>
      </div>
    </div>
  );
}
