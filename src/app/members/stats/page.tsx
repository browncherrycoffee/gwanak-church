"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  UsersThree,
  ChartBar,
  CaretDown,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMembers, subscribe } from "@/lib/member-store";
import { POSITION_ORDER, DEPARTMENTS, BAPTISM_TYPES } from "@/lib/constants";
import type { Member } from "@/types";

function StatBar({ label, count, total, color = "bg-primary", members, expanded, onToggle }: {
  label: string;
  count: number;
  total: number;
  color?: string;
  members?: Member[];
  expanded?: boolean;
  onToggle?: () => void;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  const clickable = !!members && members.length > 0;
  return (
    <div>
      <button
        type="button"
        className={`flex w-full items-center gap-3 rounded-md px-1 py-0.5 transition-colors ${clickable ? "cursor-pointer hover:bg-secondary/50" : ""}`}
        onClick={clickable ? onToggle : undefined}
      >
        <span className="w-28 shrink-0 text-sm text-right text-muted-foreground truncate">{label}</span>
        <div className="flex-1 h-5 rounded-full bg-secondary overflow-hidden">
          <div
            className={`h-full rounded-full ${color} transition-all`}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="w-14 shrink-0 text-sm font-medium text-right">
          {count}명
          <span className="text-xs text-muted-foreground ml-1">({pct}%)</span>
        </span>
        {clickable && (
          <CaretDown
            weight="bold"
            className={`h-3 w-3 shrink-0 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {expanded && members && members.length > 0 && (
        <div className="ml-[7.75rem] mt-1 mb-2 space-y-0.5">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/members/${m.id}`}
              className="flex items-center gap-2 rounded-md px-2 py-1 text-sm hover:bg-secondary transition-colors"
            >
              <span className="font-medium">{m.name}</span>
              {m.position && m.position !== "성도" && (
                <Badge variant="secondary" className="text-[10px]">{m.position}</Badge>
              )}
              {m.department && (
                <span className="text-xs text-muted-foreground ml-auto">{m.department}</span>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground mb-4">
      <ChartBar weight="light" className="h-4 w-4" />
      {children}
    </h2>
  );
}

function getAgeGroup(birthDate: string | null): string {
  if (!birthDate) return "미입력";
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return "미입력";
  const age = new Date().getFullYear() - birth.getFullYear();
  if (age < 10) return "10세 미만";
  if (age < 20) return "10대";
  if (age < 30) return "20대";
  if (age < 40) return "30대";
  if (age < 50) return "40대";
  if (age < 60) return "50대";
  if (age < 70) return "60대";
  return "70대 이상";
}

const AGE_GROUP_ORDER = ["10세 미만", "10대", "20대", "30대", "40대", "50대", "60대", "70대 이상", "미입력"];

function getResidenceArea(address: string | null): string {
  if (!address || !address.trim()) return "미입력";
  // 우편번호 제거: 08821 또는 (08821) 형태
  const cleaned = address.replace(/^\(?\d{5}\)?\s*/, "").trim();
  if (!cleaned) return "미입력";

  // 서울: 구 단위
  const seoulMatch = cleaned.match(/^서울(?:특별시|시)?\s+(\S+구)/);
  if (seoulMatch?.[1]) return `서울 ${seoulMatch[1]}`;

  // 경기도: 시 단위
  const gyeonggiMatch = cleaned.match(/^경기(?:도)?\s+(\S+시)/);
  if (gyeonggiMatch?.[1]) return `경기 ${gyeonggiMatch[1]}`;

  // 그 외 광역시: 구 단위
  const metroMatch = cleaned.match(/^(인천|부산|대구|대전|광주|울산)(?:광역시|시)?\s+(\S+구)/);
  if (metroMatch?.[1] && metroMatch[2]) return `${metroMatch[1]} ${metroMatch[2]}`;

  // 세종시
  if (/^세종(?:특별자치시|시)?/.test(cleaned)) return "세종시";

  // 기타 도: 시/군 단위
  const doMatch = cleaned.match(/^(충청북도|충북|충청남도|충남|전라북도|전북|전라남도|전남|경상북도|경북|경상남도|경남|강원도|강원|제주(?:특별자치도|도)?)\s+(\S+[시군])/);
  if (doMatch?.[1] && doMatch[2]) {
    const doName = doMatch[1].replace(/도$/, "").replace(/특별자치도$/, "");
    return `${doName} ${doMatch[2]}`;
  }

  // 파싱 실패 시 첫 두 단어
  const words = cleaned.split(/\s+/);
  return words.slice(0, 2).join(" ") || "기타";
}

type StatItem = { label: string; count: number; members: Member[] };

function groupMembers(source: Member[], keyFn: (m: Member) => string, order?: string[]): StatItem[] {
  const map = new Map<string, Member[]>();
  for (const m of source) {
    const key = keyFn(m);
    const arr = map.get(key);
    if (arr) arr.push(m);
    else map.set(key, [m]);
  }
  const items: StatItem[] = [];
  if (order) {
    for (const key of order) {
      const arr = map.get(key);
      if (arr) items.push({ label: key, count: arr.length, members: arr });
      map.delete(key);
    }
  }
  for (const [label, arr] of map) {
    items.push({ label, count: arr.length, members: arr });
  }
  return items;
}

export default function StatsPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const toggle = (key: string) => setExpandedKey((prev) => (prev === key ? null : key));

  const active = useMemo(() => members.filter((m) => m.memberStatus === "활동"), [members]);
  const nonRemoved = useMemo(() => members.filter((m) => m.memberStatus !== "제적"), [members]);

  // 직분별
  const byPosition = useMemo(
    () => groupMembers(nonRemoved, (m) => m.position || "미입력", [...POSITION_ORDER]),
    [nonRemoved],
  );

  // 소속(부서)별 — 활동 교인 기준
  const byDepartment = useMemo(
    () => groupMembers(active, (m) => m.department || "미배정", [...DEPARTMENTS]).sort((a, b) => b.count - a.count),
    [active],
  );

  // 성별
  const byGender = useMemo(() => {
    const all = groupMembers(nonRemoved, (m) => m.gender || "미입력");
    const order = ["남", "여", "미입력"];
    return order.map((l) => all.find((x) => x.label === l)).filter((x): x is StatItem => !!x && x.count > 0);
  }, [nonRemoved]);

  // 세례 종류별
  const byBaptism = useMemo(
    () => groupMembers(nonRemoved, (m) => m.baptismType || "미입력", [...BAPTISM_TYPES]),
    [nonRemoved],
  );

  // 연령대별
  const byAge = useMemo(() => {
    const all = groupMembers(nonRemoved, (m) => getAgeGroup(m.birthDate));
    return AGE_GROUP_ORDER.map((l) => all.find((x) => x.label === l)).filter((x): x is StatItem => !!x && x.count > 0);
  }, [nonRemoved]);

  // 구역별 — 활동 교인 기준
  const byDistrict = useMemo(() => {
    const items = groupMembers(active, (m) => m.district || "");
    return items.filter((x) => x.label).sort((a, b) => a.label.localeCompare(b.label, "ko"));
  }, [active]);

  // 주거지별 — 전체 등록교인 기준
  const byResidence = useMemo(
    () => groupMembers(nonRemoved, (m) => getResidenceArea(m.address)).sort((a, b) => b.count - a.count),
    [nonRemoved],
  );

  // 최근 등록 교인
  const recentMembers = useMemo(() => {
    const cutoff = new Date();
    cutoff.setMonth(cutoff.getMonth() - 3);
    return nonRemoved
      .filter((m) => m.registrationDate && m.registrationDate >= cutoff.toISOString().slice(0, 10))
      .sort((a, b) => (b.registrationDate ?? "").localeCompare(a.registrationDate ?? ""))
      .slice(0, 10);
  }, [nonRemoved]);

  const removed = members.filter((m) => m.memberStatus === "제적");
  const inactive = members.filter((m) => m.memberStatus === "비활동");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-14 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <Link href="/" className="shrink-0">
              <Cross weight="fill" className="h-7 w-7 text-primary" />
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">
                <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
                목록
              </Link>
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <UsersThree weight="light" className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">교인 통계</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">

        {/* 전체 현황 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "전체 등록교인", value: nonRemoved.length, sub: "제적 제외" },
            { label: "출석 교인", value: active.length, sub: "활동" },
            { label: "비활동", value: inactive.length, sub: "" },
            { label: "제적", value: removed.length, sub: "" },
          ].map((item) => (
            <Card key={item.label}>
              <CardContent className="p-4 text-center">
                <p className="text-2xl font-bold text-primary">{item.value}</p>
                <p className="text-xs font-medium mt-0.5">{item.label}</p>
                {item.sub && <p className="text-xs text-muted-foreground">{item.sub}</p>}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 직분별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>직분별 분포 (전체 등록교인 기준)</SectionTitle>
            <div className="space-y-1">
              {byPosition.map((item) => (
                <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} members={item.members} expanded={expandedKey === `pos:${item.label}`} onToggle={() => toggle(`pos:${item.label}`)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 성별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>성별 분포 (전체 등록교인 기준)</SectionTitle>
            <div className="space-y-1">
              {byGender.map((item) => (
                <StatBar
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  total={nonRemoved.length}
                  color={item.label === "남" ? "bg-blue-500" : item.label === "여" ? "bg-rose-400" : "bg-muted-foreground"}
                  members={item.members}
                  expanded={expandedKey === `gen:${item.label}`}
                  onToggle={() => toggle(`gen:${item.label}`)}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 연령대별 */}
        {byAge.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <SectionTitle>연령대별 분포 (생년월일 입력 기준)</SectionTitle>
              <div className="space-y-1">
                {byAge.map((item) => (
                  <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} members={item.members} expanded={expandedKey === `age:${item.label}`} onToggle={() => toggle(`age:${item.label}`)} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 소속(부서)별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>소속별 분포 (출석 교인 기준)</SectionTitle>
            <div className="space-y-1">
              {byDepartment.map((item) => (
                <StatBar key={item.label} label={item.label} count={item.count} total={active.length} members={item.members} expanded={expandedKey === `dept:${item.label}`} onToggle={() => toggle(`dept:${item.label}`)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 구역별 */}
        {byDistrict.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <SectionTitle>구역별 분포 (출석 교인 기준)</SectionTitle>
              <div className="space-y-1">
                {byDistrict.map((item) => (
                  <StatBar key={item.label} label={item.label} count={item.count} total={active.length} members={item.members} expanded={expandedKey === `dist:${item.label}`} onToggle={() => toggle(`dist:${item.label}`)} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 주거지별 */}
        {byResidence.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <SectionTitle>주거지별 분포 (전체 등록교인 기준)</SectionTitle>
              <div className="space-y-1">
                {byResidence.map((item) => (
                  <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} members={item.members} expanded={expandedKey === `res:${item.label}`} onToggle={() => toggle(`res:${item.label}`)} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 세례 종류별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>세례 종류별 (전체 등록교인 기준)</SectionTitle>
            <div className="space-y-1">
              {byBaptism.map((item) => (
                <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} members={item.members} expanded={expandedKey === `bap:${item.label}`} onToggle={() => toggle(`bap:${item.label}`)} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 최근 3개월 신규 등록 */}
        {recentMembers.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <SectionTitle>최근 3개월 신규 등록 ({recentMembers.length}명)</SectionTitle>
              <div className="space-y-1">
                {recentMembers.map((m) => (
                  <Link
                    key={m.id}
                    href={`/members/${m.id}`}
                    className="flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-secondary transition-colors"
                  >
                    <span className="text-xs text-muted-foreground w-24 shrink-0">{m.registrationDate}</span>
                    <span className="text-sm font-medium">{m.name}</span>
                    {m.position && (
                      <Badge variant="secondary" className="text-[10px]">{m.position}</Badge>
                    )}
                    {m.department && (
                      <span className="text-xs text-muted-foreground ml-auto">{m.department}</span>
                    )}
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
