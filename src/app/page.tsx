"use client";

import { useState, useCallback, useMemo, useRef, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cross, MagnifyingGlass, Users, UserPlus, User, UploadSimple, TreeStructure, Heart, Cake, Database } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { getMembers, subscribe } from "@/lib/member-store";
import { searchMembers } from "@/lib/search";

function getBirthMonthDay(birthDate: string): { month: number; day: number } | null {
  const m = birthDate.match(/\d{4}-(\d{2})-(\d{2})/);
  if (!m) return null;
  const month = parseInt(m[1] ?? "0");
  const day = parseInt(m[2] ?? "0");
  if (!month || !day) return null;
  return { month, day };
}

function daysUntilBirthday(birthDate: string, today: Date): number {
  const md = getBirthMonthDay(birthDate);
  if (!md) return Number.POSITIVE_INFINITY;
  const year = today.getFullYear();
  let next = new Date(year, md.month - 1, md.day);
  if (next.getTime() < today.getTime()) {
    next = new Date(year + 1, md.month - 1, md.day);
  }
  return Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HomePage() {
  const [query, setQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const nonRemoved = members.filter((m) => m.memberStatus !== "제적");
  const activeCount = nonRemoved.filter((m) => m.memberStatus === "활동").length;

  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const upcomingBirthdays = useMemo(
    () =>
      nonRemoved
        .filter((m) => m.birthDate && daysUntilBirthday(m.birthDate, today) <= 7)
        .sort((a, b) => {
          const da = a.birthDate ? daysUntilBirthday(a.birthDate, today) : 999;
          const db = b.birthDate ? daysUntilBirthday(b.birthDate, today) : 999;
          return da - db;
        })
        .slice(0, 3),
    [nonRemoved, today],
  );

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
            autoFocus={false}
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

        <div className="mt-6 flex justify-center gap-3 flex-wrap">
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
          <Button
            asChild
            variant="outline"
            className="rounded-full px-6"
          >
            <Link href="/members/departments">
              <TreeStructure weight="light" className="mr-2 h-4 w-4" />
              부서별
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full px-6"
          >
            <Link href="/members/prayer">
              <Heart weight="light" className="mr-2 h-4 w-4" />
              기도 목록
            </Link>
          </Button>
          <Button
            asChild
            variant="outline"
            className="rounded-full px-6"
          >
            <Link href="/members/birthday">
              <Cake weight="light" className="mr-2 h-4 w-4" />
              생일 목록
            </Link>
          </Button>
        </div>
      </div>

      {/* 이번 주 생일 위젯 */}
      {upcomingBirthdays.length > 0 && (
        <div className="mt-8 w-full max-w-md rounded-xl border border-primary/20 bg-primary/5 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Cake weight="fill" className="h-4 w-4" />
            이번 주 생일
          </h2>
          <div className="space-y-2">
            {upcomingBirthdays.map((m) => {
              const md = m.birthDate ? getBirthMonthDay(m.birthDate) : null;
              const days = m.birthDate ? daysUntilBirthday(m.birthDate, today) : null;
              return (
                <Link
                  key={m.id}
                  href={`/members/${m.id}`}
                  className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-primary/10 transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                    {md?.day}
                  </span>
                  <span className="flex-1 text-sm font-medium">{m.name}</span>
                  {m.position && (
                    <span className="text-xs text-muted-foreground">{m.position}</span>
                  )}
                  <span className="text-xs font-medium text-primary">
                    {days === 0 ? "오늘" : `D-${days}`}
                  </span>
                </Link>
              );
            })}
          </div>
          {upcomingBirthdays.length === 3 && (
            <Link
              href="/members/birthday"
              className="mt-2 block text-center text-xs text-primary hover:underline"
            >
              전체 보기
            </Link>
          )}
        </div>
      )}

      {/* 통계 */}
      <div className="mt-12 flex items-center gap-6 sm:gap-8 text-center">
        <div>
          <p className="text-2xl font-bold text-primary">{nonRemoved.length}</p>
          <p className="text-xs text-muted-foreground">전체등록교인</p>
        </div>
        <div className="h-8 w-px bg-border" />
        <div>
          <p className="text-2xl font-bold text-primary">{activeCount}</p>
          <p className="text-xs text-muted-foreground">출석 교인</p>
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
      <div className="mt-10 flex flex-wrap justify-center gap-5 text-sm text-muted-foreground">
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
        <Link
          href="/members/backup"
          className="flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <Database weight="light" className="h-4 w-4" />
          백업 / 복원
        </Link>
      </div>
    </div>
  );
}
