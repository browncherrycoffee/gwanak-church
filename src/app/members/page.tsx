"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Cross,
  UserPlus,
  FunnelSimple,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberCard } from "@/components/members/member-card";
import { searchMembers } from "@/lib/search";
import { getMembers, subscribe } from "@/lib/member-store";
import { POSITIONS, DEPARTMENTS } from "@/lib/constants";

export default function MembersListPage() {
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  let filtered = query ? searchMembers(members, query) : members;

  if (positionFilter) {
    filtered = filtered.filter((m) => m.position === positionFilter);
  }
  if (departmentFilter) {
    filtered = filtered.filter((m) => m.department === departmentFilter);
  }

  const activeCount = members.filter((m) => m.isActive).length;

  return (
    <div className="min-h-screen">
      {/* 헤더 */}
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
            />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "text-primary" : ""}
          >
            <FunnelSimple weight="light" className="mr-1.5 h-4 w-4" />
            필터
          </Button>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/members/new">
              <UserPlus weight="light" className="mr-1.5 h-4 w-4" />
              등록
            </Link>
          </Button>
        </div>

        {/* 필터 영역 */}
        {showFilters && (
          <div className="border-t bg-muted/30 px-4 py-3">
            <div className="mx-auto flex max-w-5xl flex-wrap gap-3">
              <select
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                value={positionFilter}
                onChange={(e) => setPositionFilter(e.target.value)}
              >
                <option value="">전체 직분</option>
                {POSITIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <select
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                value={departmentFilter}
                onChange={(e) => setDepartmentFilter(e.target.value)}
              >
                <option value="">전체 소속</option>
                {DEPARTMENTS.map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              {(positionFilter || departmentFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPositionFilter("");
                    setDepartmentFilter("");
                  }}
                >
                  필터 초기화
                </Button>
              )}
            </div>
          </div>
        )}
      </header>

      {/* 목록 */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">전체 교적</h1>
            <Badge variant="secondary">{filtered.length}명</Badge>
            {filtered.length !== members.length && (
              <span className="text-xs text-muted-foreground">
                (전체 {members.length}명 중)
              </span>
            )}
          </div>
          <span className="text-xs text-muted-foreground">
            활동 {activeCount}명
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <MagnifyingGlass weight="thin" className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="font-medium">조건에 맞는 교인이 없습니다</p>
            <p className="mt-1 text-sm text-muted-foreground">
              검색어나 필터를 조정해 주세요
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
