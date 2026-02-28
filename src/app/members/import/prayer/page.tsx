"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  Heart,
  Check,
  Warning,
  CircleNotch,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMembers, subscribe, bulkAddPrayerRequests } from "@/lib/member-store";

interface PrayerImportEntry {
  name: string;
  prayers: { createdAt: string; content: string; source: string }[];
}

interface MatchedEntry {
  memberId: string;
  memberName: string;
  prayers: { content: string; createdAt: string }[];
  total: number;
}

export default function PrayerImportPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const [status, setStatus] = useState<"loading" | "ready" | "done" | "error">("loading");
  const [matched, setMatched] = useState<MatchedEntry[]>([]);
  const [unmatched, setUnmatched] = useState<string[]>([]);
  const [importedCount, setImportedCount] = useState(0);
  const [expandedName, setExpandedName] = useState<string | null>(null);

  useEffect(() => {
    if (members.length === 0) return;

    fetch("/data/prayer-import.json")
      .then((r) => r.json())
      .then((data: PrayerImportEntry[]) => {
        const nameToId = new Map(members.map((m) => [m.name, m.id]));

        const matchedEntries: MatchedEntry[] = [];
        const unmatchedNames: string[] = [];

        for (const entry of data) {
          const memberId = nameToId.get(entry.name);
          if (memberId) {
            matchedEntries.push({
              memberId,
              memberName: entry.name,
              prayers: entry.prayers.map((p) => ({
                content: p.content,
                createdAt: p.createdAt,
              })),
              total: entry.prayers.length,
            });
          } else {
            unmatchedNames.push(entry.name);
          }
        }

        setMatched(matchedEntries);
        setUnmatched(unmatchedNames);
        setStatus("ready");
      })
      .catch(() => setStatus("error"));
  }, [members]);

  const handleImport = () => {
    const entries = matched.map((m) => ({
      memberId: m.memberId,
      prayers: m.prayers,
    }));
    const { totalAdded } = bulkAddPrayerRequests(entries);
    setImportedCount(totalAdded);
    setStatus("done");
  };

  const totalPrayers = matched.reduce((s, m) => s + m.total, 0);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/members">
              <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
              목록
            </Link>
          </Button>
          <div className="flex items-center gap-1.5">
            <Heart weight="light" className="h-4 w-4 text-primary" />
            <h1 className="font-semibold">기도제목 일괄 가져오기</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-5">

        {status === "loading" && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6">
              <CircleNotch weight="light" className="h-5 w-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">데이터 분석 중...</span>
            </CardContent>
          </Card>
        )}

        {status === "error" && (
          <Card>
            <CardContent className="p-6 text-center">
              <Warning weight="light" className="mx-auto mb-2 h-8 w-8 text-destructive" />
              <p className="font-medium text-destructive">가져오기 파일을 불러올 수 없습니다</p>
              <p className="mt-1 text-sm text-muted-foreground">
                public/data/prayer-import.json 파일을 확인하세요
              </p>
            </CardContent>
          </Card>
        )}

        {status === "done" && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10">
              <Check weight="light" className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold">
                기도제목 {importedCount}건 가져오기 완료
              </p>
              <p className="text-sm text-muted-foreground">
                (이미 등록된 중복 항목은 제외됨)
              </p>
              <Button asChild className="mt-2">
                <Link href="/members">교인 목록으로</Link>
              </Button>
            </CardContent>
          </Card>
        )}

        {status === "ready" && (
          <>
            {/* 요약 카드 */}
            <Card>
              <CardContent className="p-5">
                <div className="flex flex-wrap gap-6 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{matched.length}</p>
                    <p className="text-xs text-muted-foreground">매칭된 교인</p>
                  </div>
                  <div className="h-10 w-px bg-border self-center" />
                  <div>
                    <p className="text-2xl font-bold text-primary">{totalPrayers}</p>
                    <p className="text-xs text-muted-foreground">가져올 기도제목</p>
                  </div>
                  <div className="h-10 w-px bg-border self-center" />
                  <div>
                    <p className="text-2xl font-bold text-muted-foreground">{unmatched.length}</p>
                    <p className="text-xs text-muted-foreground">미매칭 (교적 없음)</p>
                  </div>
                </div>
                <div className="mt-5 flex justify-end">
                  <Button onClick={handleImport} disabled={matched.length === 0}>
                    <Heart weight="light" className="mr-2 h-4 w-4" />
                    {matched.length}명 · {totalPrayers}건 가져오기
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* 매칭된 교인 목록 */}
            <Card>
              <CardContent className="p-5">
                <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
                  매칭된 교인 ({matched.length}명)
                </h2>
                <div className="space-y-1">
                  {matched
                    .sort((a, b) => b.total - a.total)
                    .map((entry) => (
                      <div key={entry.memberId}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-secondary transition-colors text-left"
                          onClick={() =>
                            setExpandedName(
                              expandedName === entry.memberName ? null : entry.memberName,
                            )
                          }
                        >
                          <div className="flex items-center gap-2">
                            <Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm font-medium">{entry.memberName}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {entry.total}건
                          </Badge>
                        </button>
                        {expandedName === entry.memberName && (
                          <div className="ml-6 mt-1 mb-2 space-y-1.5 rounded-md border bg-muted/30 p-3">
                            {entry.prayers.map((p, i) => (
                              <div key={`${entry.memberId}-${i}`} className="text-xs">
                                <span className="text-muted-foreground">
                                  {p.createdAt === "미기재"
                                    ? "날짜 미기재"
                                    : new Date(p.createdAt).toLocaleDateString("ko-KR")}
                                  {" · "}
                                </span>
                                <span className="whitespace-pre-wrap">{p.content}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>

            {/* 미매칭 목록 */}
            {unmatched.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Warning weight="light" className="h-4 w-4 text-amber-500" />
                    미매칭 — 교적에 없는 이름 ({unmatched.length}명)
                  </h2>
                  <p className="mb-3 text-xs text-muted-foreground">
                    교적부 이름과 정확히 일치하지 않아 가져오지 않습니다.
                    교인 등록 후 재시도하거나, 교인 상세 페이지에서 직접 입력하세요.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {unmatched.map((name) => (
                      <Badge
                        key={name}
                        variant="outline"
                        className="text-xs border-amber-300 text-amber-700 dark:text-amber-400"
                      >
                        {name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </main>
    </div>
  );
}
