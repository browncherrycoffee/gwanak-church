"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  MagnifyingGlass,
  Cross,
  UserPlus,
  FunnelSimple,
  SortAscending,
  DownloadSimple,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MemberCard } from "@/components/members/member-card";
import { exportMembersCsv } from "@/lib/export";
import { searchMembers } from "@/lib/search";
import { getMembers, subscribe } from "@/lib/member-store";
import { POSITIONS, DEPARTMENTS } from "@/lib/constants";
import type { Member } from "@/types";

type SortKey = "name" | "position" | "registrationDate" | "department";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "name", label: "이름순" },
  { value: "position", label: "직분순" },
  { value: "department", label: "소속순" },
  { value: "registrationDate", label: "등록일순" },
];

const POSITION_ORDER = [
  "담임목사", "교수목사", "강도사", "전도사", "장로", "집사", "성도", "청년", "학생",
];

function sortMembers(members: Member[], key: SortKey): Member[] {
  return [...members].sort((a, b) => {
    switch (key) {
      case "name":
        return (a.name).localeCompare(b.name, "ko");
      case "position": {
        const aIdx = POSITION_ORDER.indexOf(a.position ?? "");
        const bIdx = POSITION_ORDER.indexOf(b.position ?? "");
        const aOrder = aIdx === -1 ? 999 : aIdx;
        const bOrder = bIdx === -1 ? 999 : bIdx;
        return aOrder - bOrder;
      }
      case "department":
        return (a.department ?? "").localeCompare(b.department ?? "", "ko");
      case "registrationDate":
        return (a.registrationDate ?? "").localeCompare(b.registrationDate ?? "");
      default:
        return 0;
    }
  });
}

export default function MembersListPage() {
  const [query, setQuery] = useState("");
  const [positionFilter, setPositionFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState<"" | "active" | "inactive">("");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [showFilters, setShowFilters] = useState(false);

  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const filtered = useMemo(() => {
    let result = query ? searchMembers(members, query) : members;

    if (positionFilter) {
      result = result.filter((m) => m.position === positionFilter);
    }
    if (departmentFilter) {
      result = result.filter((m) => m.department === departmentFilter);
    }
    if (activeFilter === "active") {
      result = result.filter((m) => m.isActive);
    } else if (activeFilter === "inactive") {
      result = result.filter((m) => !m.isActive);
    }

    return query ? result : sortMembers(result, sortKey);
  }, [members, query, positionFilter, departmentFilter, activeFilter, sortKey]);

  const activeCount = members.filter((m) => m.isActive).length;
  const hasFilters = positionFilter || departmentFilter || activeFilter;

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
            className={showFilters || hasFilters ? "text-primary" : ""}
          >
            <FunnelSimple weight="light" className="h-4 w-4 sm:mr-1.5" />
            <span className="hidden sm:inline">필터</span>
            {hasFilters && (
              <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                {[positionFilter, departmentFilter, activeFilter].filter(Boolean).length}
              </span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportMembersCsv(filtered)}
            title="CSV 내보내기"
          >
            <DownloadSimple weight="light" className="h-4 w-4" />
          </Button>
          <Button asChild size="sm" className="shrink-0">
            <Link href="/members/new">
              <UserPlus weight="light" className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">등록</span>
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
              <select
                className="rounded-md border bg-background px-3 py-1.5 text-sm"
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value as "" | "active" | "inactive")}
              >
                <option value="">전체 상태</option>
                <option value="active">활동</option>
                <option value="inactive">비활동</option>
              </select>
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPositionFilter("");
                    setDepartmentFilter("");
                    setActiveFilter("");
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
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              활동 {activeCount}명
            </span>
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
