"use client";

import { useState, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cross, MagnifyingGlass, Users, UserPlus, User, UploadSimple } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMembers, subscribe } from "@/lib/member-store";
import { searchMembers } from "@/lib/search";

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const activeCount = members.filter((m) => m.isActive).length;

  const suggestions = useMemo(() => {
    if (!query.trim() || query.trim().length < 1) return [];
    return searchMembers(members, query).slice(0, 5);
  }, [members, query]);

  const handleSearch = useCallback(() => {
    if (query.trim()) {
      setShowSuggestions(false);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }, [query, router]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        if (selectedIndex >= 0 && selectedIndex < suggestions.length) {
          const selected = suggestions[selectedIndex];
          if (selected) {
            setShowSuggestions(false);
            router.push(`/members/${selected.id}`);
            return;
          }
        }
        handleSearch();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, suggestions.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Escape") {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      }
    },
    [handleSearch, suggestions, selectedIndex, router],
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setShowSuggestions(true);
    setSelectedIndex(-1);
  };

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
            className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors z-10"
          />
          <Input
            ref={inputRef}
            type="text"
            placeholder="교인 이름, 연락처, 주소로 검색..."
            className={`h-14 border-2 pl-12 pr-4 text-lg shadow-sm focus:border-primary focus:shadow-md transition-shadow ${
              showSuggestions && suggestions.length > 0
                ? "rounded-t-3xl rounded-b-none border-b-0"
                : "rounded-full"
            }`}
            value={query}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            autoFocus
          />

          {/* 검색 제안 드롭다운 */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute left-0 right-0 top-full z-20 rounded-b-3xl border-2 border-t-0 border-border bg-background shadow-lg overflow-hidden">
              <div className="border-t mx-4" />
              {suggestions.map((member, index) => (
                <Link
                  key={member.id}
                  href={`/members/${member.id}`}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    index === selectedIndex ? "bg-secondary" : "hover:bg-muted"
                  }`}
                  onMouseEnter={() => setSelectedIndex(index)}
                >
                  <User weight="light" className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{member.name}</span>
                      {member.position && (
                        <span className="text-xs text-muted-foreground">{member.position}</span>
                      )}
                    </div>
                    {member.phone && (
                      <p className="text-xs text-muted-foreground truncate">{member.phone}</p>
                    )}
                  </div>
                </Link>
              ))}
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-sm text-primary hover:bg-muted transition-colors"
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSearch();
                }}
              >
                <MagnifyingGlass weight="light" className="h-4 w-4 shrink-0" />
                &quot;{query}&quot; 전체 검색
              </button>
            </div>
          )}
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
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-2xl font-bold text-primary">
            {new Set(members.map((m) => m.department).filter(Boolean)).size}
          </p>
          <p className="text-xs text-muted-foreground">부서</p>
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
        <Link
          href="/members/import"
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <UploadSimple weight="light" className="h-4 w-4" />
          일괄 가져오기
        </Link>
      </div>
    </div>
  );
}
