"use client";

import { useState, useEffect, useSyncExternalStore, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  MagnifyingGlass,
  Cross,
  UserPlus,
  Users,
  ArrowLeft,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberCard } from "@/components/members/member-card";
import { searchMembers } from "@/lib/search";
import { getMembers, subscribe } from "@/lib/member-store";

function SearchContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const initialQuery = searchParams.get("q") ?? "";
  const [query, setQuery] = useState(initialQuery);

  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const results = searchMembers(members, initialQuery);

  useEffect(() => {
    setQuery(searchParams.get("q") ?? "");
  }, [searchParams]);

  const handleSearch = () => {
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleSearch();
    if (e.key === "Escape") {
      setQuery("");
      router.push("/");
    }
  };

  return (
    <div className="min-h-screen">
      {/* 상단 검색 바 */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <div className="relative flex-1 max-w-2xl">
            <MagnifyingGlass
              weight="light"
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="교인 검색..."
              className="h-10 rounded-full pl-10 pr-4"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
          <Button onClick={handleSearch} size="sm" className="rounded-full shrink-0">
            검색
          </Button>
        </div>
      </header>

      {/* 결과 */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="mr-1">
              <Link href="/">
                <ArrowLeft weight="light" className="h-4 w-4" />
              </Link>
            </Button>
            <p className="text-sm text-muted-foreground">
              &quot;{initialQuery}&quot; 검색 결과
            </p>
            <Badge variant="secondary">{results.length}명</Badge>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">
                <Users weight="light" className="mr-1.5 h-4 w-4" />
                전체 목록
              </Link>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <Link href="/members/new">
                <UserPlus weight="light" className="mr-1.5 h-4 w-4" />
                등록
              </Link>
            </Button>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="py-16 text-center">
            <MagnifyingGlass weight="thin" className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-medium">검색 결과가 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              다른 검색어로 시도하거나 오타를 확인해 주세요
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="outline">
                <Link href="/">
                  <ArrowLeft weight="light" className="mr-2 h-4 w-4" />
                  홈으로
                </Link>
              </Button>
              <Button asChild>
                <Link href="/members/new">
                  <UserPlus weight="light" className="mr-2 h-4 w-4" />
                  새 교인 등록
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {results.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchContent />
    </Suspense>
  );
}
