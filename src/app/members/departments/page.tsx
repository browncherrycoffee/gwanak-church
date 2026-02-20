"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  CaretDown,
  CaretRight,
  User,
  Phone,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMembers, subscribe } from "@/lib/member-store";
import { DEPARTMENTS } from "@/lib/constants";

export default function DepartmentsPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const [openDepts, setOpenDepts] = useState<Set<string>>(new Set());

  const activeMembers = useMemo(
    () => members.filter((m) => m.memberStatus === "활동"),
    [members],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof members>();
    for (const dept of DEPARTMENTS) {
      map.set(dept, []);
    }
    const noDept: typeof members = [];

    for (const m of activeMembers) {
      if (m.department) {
        const list = map.get(m.department);
        if (list) {
          list.push(m);
        } else {
          map.set(m.department, [m]);
        }
      } else {
        noDept.push(m);
      }
    }

    const result: { name: string; members: typeof members }[] = [];
    for (const [name, list] of map) {
      if (list.length > 0) {
        result.push({ name, members: list });
      }
    }
    if (noDept.length > 0) {
      result.push({ name: "미배정", members: noDept });
    }
    return result;
  }, [activeMembers]);

  const toggleDept = (dept: string) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(dept)) {
        next.delete(dept);
      } else {
        next.add(dept);
      }
      return next;
    });
  };

  const expandAll = () => {
    setOpenDepts(new Set(grouped.map((g) => g.name)));
  };

  const collapseAll = () => {
    setOpenDepts(new Set());
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/members">
              <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
              전체 목록
            </Link>
          </Button>
          <div className="flex-1" />
          <Button variant="ghost" size="sm" onClick={expandAll}>
            모두 펼치기
          </Button>
          <Button variant="ghost" size="sm" onClick={collapseAll}>
            모두 접기
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">
        <div className="mb-4 flex items-center gap-2">
          <h1 className="text-lg font-bold">부서별 목록</h1>
          <Badge variant="secondary">{grouped.length}개 부서</Badge>
          <span className="text-xs text-muted-foreground">
            (출석교인 {activeMembers.length}명)
          </span>
        </div>

        <div className="space-y-3">
          {grouped.map((group) => {
            const isOpen = openDepts.has(group.name);
            return (
              <Card key={group.name}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
                  onClick={() => toggleDept(group.name)}
                >
                  <div className="flex items-center gap-3">
                    {isOpen ? (
                      <CaretDown weight="bold" className="h-4 w-4 text-primary" />
                    ) : (
                      <CaretRight weight="bold" className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold">{group.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {group.members.length}명
                    </Badge>
                  </div>
                </button>
                {isOpen && (
                  <CardContent className="px-4 pb-4 pt-0">
                    <div className="border-t pt-3 space-y-1">
                      {group.members.map((m) => (
                        <Link
                          key={m.id}
                          href={`/members/${m.id}`}
                          className="flex items-center gap-3 rounded-md px-3 py-2 hover:bg-secondary transition-colors"
                        >
                          <User weight="light" className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium">{m.name}</span>
                          {m.position && (
                            <Badge variant="secondary" className="text-[10px]">
                              {m.position}
                            </Badge>
                          )}
                          {m.phone && (
                            <span className="ml-auto flex items-center gap-1 text-xs text-muted-foreground">
                              <Phone weight="light" className="h-3 w-3" />
                              {m.phone}
                            </span>
                          )}
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      </main>
    </div>
  );
}
