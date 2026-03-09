"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  Heart,
  Check,
  Warning,
  ClipboardText,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMembers, subscribe, bulkAddPrayerRequests } from "@/lib/member-store";

interface ParsedEntry {
  memberId: string;
  memberName: string;
  prayers: { content: string; createdAt: string }[];
}

// "26.03.08" or "26.3.8" → "2026-03-08"
function parseColDate(raw: string): string | null {
  const s = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{2})\.(\d{1,2})\.(\d{1,2})$/);
  if (!m) return null;
  const [, yy, mm, dd] = m;
  return `20${yy}-${mm!.padStart(2, "0")}-${dd!.padStart(2, "0")}`;
}

function parseTSV(text: string, nameToId: Map<string, string>): {
  matched: ParsedEntry[];
  unmatched: string[];
  dates: string[];
  error?: string;
} {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return { matched: [], unmatched: [], dates: [], error: "데이터가 2행 이상이어야 합니다." };

  const headers = (lines[0] ?? "").split("\t");
  const dateCols: { idx: number; date: string }[] = [];
  for (let i = 1; i < headers.length; i++) {
    const d = parseColDate(headers[i] ?? "");
    if (d) dateCols.push({ idx: i, date: d });
  }
  if (dateCols.length === 0) {
    return { matched: [], unmatched: [], dates: [], error: "날짜 열을 찾을 수 없습니다. 헤더 행에 YY.MM.DD 형식으로 날짜를 입력하세요." };
  }

  const matchedMap = new Map<string, ParsedEntry>();
  const unmatched: string[] = [];

  for (let li = 1; li < lines.length; li++) {
    const cells = (lines[li] ?? "").split("\t").map((c) => c.replace(/^"|"$/g, "").trim());
    const name = cells[0]?.trim() ?? "";
    if (!name) continue;

    const memberId = nameToId.get(name);
    if (!memberId) {
      if (!unmatched.includes(name)) unmatched.push(name);
      continue;
    }

    const entry = matchedMap.get(memberId) ?? { memberId, memberName: name, prayers: [] };
    for (const col of dateCols) {
      const content = cells[col.idx]?.trim();
      if (content) entry.prayers.push({ content, createdAt: col.date });
    }
    matchedMap.set(memberId, entry);
  }

  const matched = Array.from(matchedMap.values()).filter((e) => e.prayers.length > 0);
  return { matched, unmatched, dates: dateCols.map((c) => c.date) };
}

export default function PrayerImportPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const [pasteText, setPasteText] = useState("");
  const [parsed, setParsed] = useState<ReturnType<typeof parseTSV> | null>(null);
  const [done, setDone] = useState<{ count: number } | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const nameToId = new Map(members.map((m) => [m.name, m.id]));

  const handleAnalyze = () => {
    const result = parseTSV(pasteText, nameToId);
    setParsed(result);
    setDone(null);
    setExpandedId(null);
  };

  const handleApply = () => {
    if (!parsed || parsed.matched.length === 0) return;
    const { totalAdded } = bulkAddPrayerRequests(parsed.matched);
    setDone({ count: totalAdded });
    setParsed(null);
    setPasteText("");
  };

  const totalPrayers = parsed?.matched.reduce((s, e) => s + e.prayers.length, 0) ?? 0;

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
            <h1 className="font-semibold">기도제목 가져오기</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-5">

        {/* 완료 */}
        {done && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10">
              <Check weight="light" className="h-10 w-10 text-primary" />
              <p className="text-lg font-semibold">
                {done.count > 0 ? `기도제목 ${done.count}건 추가 완료` : "추가된 항목 없음 (모두 이미 등록됨)"}
              </p>
              <p className="text-sm text-muted-foreground">
                서버에 자동 동기화됩니다 — 다른 사람이 앱을 열면 바로 반영됩니다
              </p>
              <Button onClick={() => setDone(null)} variant="outline" className="mt-2">
                다시 가져오기
              </Button>
            </CardContent>
          </Card>
        )}

        {/* 분석 결과 */}
        {!done && parsed && (
          <>
            {parsed.error ? (
              <Card>
                <CardContent className="p-5 flex items-center gap-3">
                  <Warning weight="light" className="h-5 w-5 text-destructive shrink-0" />
                  <p className="text-sm text-destructive">{parsed.error}</p>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-5">
                  {parsed.dates.length > 0 && (
                    <div className="mb-4 flex flex-wrap gap-1.5">
                      {parsed.dates.map((d) => (
                        <Badge key={d} variant="secondary">{d}</Badge>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-6 text-center">
                    <div>
                      <p className="text-2xl font-bold text-primary">{parsed.matched.length}</p>
                      <p className="text-xs text-muted-foreground">매칭된 교인</p>
                    </div>
                    <div className="h-10 w-px bg-border self-center" />
                    <div>
                      <p className="text-2xl font-bold text-primary">{totalPrayers}</p>
                      <p className="text-xs text-muted-foreground">가져올 기도제목</p>
                    </div>
                    <div className="h-10 w-px bg-border self-center" />
                    <div>
                      <p className="text-2xl font-bold text-muted-foreground">{parsed.unmatched.length}</p>
                      <p className="text-xs text-muted-foreground">미매칭</p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setParsed(null)}>
                      다시 입력
                    </Button>
                    <Button onClick={handleApply} disabled={parsed.matched.length === 0}>
                      <Heart weight="light" className="mr-2 h-4 w-4" />
                      {parsed.matched.length}명 적용
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* 매칭 목록 */}
            {parsed.matched.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-4 text-sm font-semibold text-muted-foreground">
                    매칭된 교인 ({parsed.matched.length}명)
                  </h2>
                  <div className="space-y-1">
                    {parsed.matched.map((entry) => (
                      <div key={entry.memberId}>
                        <button
                          type="button"
                          className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-secondary transition-colors text-left"
                          onClick={() => setExpandedId(expandedId === entry.memberId ? null : entry.memberId)}
                        >
                          <div className="flex items-center gap-2">
                            <Check weight="bold" className="h-3.5 w-3.5 text-primary shrink-0" />
                            <span className="text-sm font-medium">{entry.memberName}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">{entry.prayers.length}건</Badge>
                        </button>
                        {expandedId === entry.memberId && (
                          <div className="ml-6 mt-1 mb-2 space-y-1.5 rounded-md border bg-muted/30 p-3">
                            {entry.prayers.map((p, i) => (
                              <div key={`${entry.memberId}-${i}`} className="text-xs">
                                <span className="text-muted-foreground">{p.createdAt} · </span>
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
            )}

            {/* 미매칭 */}
            {parsed.unmatched.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <h2 className="mb-3 flex items-center gap-1.5 text-sm font-semibold text-muted-foreground">
                    <Warning weight="light" className="h-4 w-4 text-amber-500" />
                    교적에 없는 이름 ({parsed.unmatched.length}명)
                  </h2>
                  <div className="flex flex-wrap gap-1.5">
                    {parsed.unmatched.map((name) => (
                      <Badge key={name} variant="outline" className="text-xs border-amber-300 text-amber-700">
                        {name}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* 입력 폼 */}
        {!done && !parsed && (
          <Card>
            <CardContent className="p-5 space-y-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <ClipboardText weight="light" className="h-5 w-5 text-primary" />
                  <h2 className="font-semibold">Google Sheets에서 붙여넣기</h2>
                </div>
                <p className="text-sm text-muted-foreground">
                  스프레드시트에서 데이터를 복사(Ctrl+C)한 후 아래에 붙여넣기(Ctrl+V)하세요.
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  형식: 1행 = <code className="bg-muted px-1 rounded">이름</code>
                  {" + "}날짜 열(<code className="bg-muted px-1 rounded">26.03.08</code> 형식) /
                  2행~ = 성도 이름 + 각 날짜의 기도제목
                </p>
              </div>
              <textarea
                className="w-full h-52 rounded-md border bg-background px-3 py-2 text-sm font-mono placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
                placeholder={"이름\t26.03.08\t26.02.08\n강기준\t기도내용 예시\t\n박성환\t\t기도내용 예시"}
                value={pasteText}
                onChange={(e) => setPasteText(e.target.value)}
              />
              <div className="flex justify-end">
                <Button onClick={handleAnalyze} disabled={!pasteText.trim()}>
                  분석하기
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
