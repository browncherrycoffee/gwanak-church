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

// 서울=초록계열, 경기=파랑계열, 기타=주황/보라, 미입력=회색
const PIE_COLORS = [
  "#166534", "#15803d", "#22c55e", "#4ade80", "#86efac", "#bbf7d0", "#dcfce7",
  "#1e40af", "#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe",
  "#c2410c", "#9333ea", "#db2777", "#f59e0b", "#14b8a6", "#6366f1",
  "#9ca3af",
];

function DonutChart({ items, total, expandedKey: currentKey, onToggle, keyPrefix }: {
  items: StatItem[];
  total: number;
  expandedKey: string | null;
  onToggle: (key: string) => void;
  keyPrefix: string;
}) {
  const cx = 100, cy = 100, outerR = 90, innerR = 55;

  // 서울→경기→기타→미입력 순으로 색상 배정
  const colorMap = useMemo(() => {
    const map = new Map<string, string>();
    let seoulIdx = 0, gyeonggiIdx = 7, otherIdx = 13;
    for (const item of items) {
      if (item.label === "미입력") map.set(item.label, "#9ca3af");
      else if (item.label.startsWith("서울")) map.set(item.label, PIE_COLORS[seoulIdx++] ?? "#86efac");
      else if (item.label.startsWith("경기")) map.set(item.label, PIE_COLORS[gyeonggiIdx++] ?? "#60a5fa");
      else map.set(item.label, PIE_COLORS[otherIdx++] ?? "#f59e0b");
    }
    return map;
  }, [items]);

  const slices = useMemo(() => {
    let angle = -Math.PI / 2;
    return items.map((item) => {
      const sweep = total > 0 ? (item.count / total) * 2 * Math.PI : 0;
      const startAngle = angle;
      angle += sweep;
      return { ...item, startAngle, sweep };
    });
  }, [items, total]);

  const slicePath = (startAngle: number, sweep: number) => {
    const clampedSweep = Math.min(sweep, 2 * Math.PI - 0.001);
    const ox1 = cx + outerR * Math.cos(startAngle);
    const oy1 = cy + outerR * Math.sin(startAngle);
    const ox2 = cx + outerR * Math.cos(startAngle + clampedSweep);
    const oy2 = cy + outerR * Math.sin(startAngle + clampedSweep);
    const ix2 = cx + innerR * Math.cos(startAngle + clampedSweep);
    const iy2 = cy + innerR * Math.sin(startAngle + clampedSweep);
    const ix1 = cx + innerR * Math.cos(startAngle);
    const iy1 = cy + innerR * Math.sin(startAngle);
    const large = clampedSweep > Math.PI ? 1 : 0;
    return `M ${ox1} ${oy1} A ${outerR} ${outerR} 0 ${large} 1 ${ox2} ${oy2} L ${ix2} ${iy2} A ${innerR} ${innerR} 0 ${large} 0 ${ix1} ${iy1} Z`;
  };

  const selectedSlice = slices.find((s) => `${keyPrefix}${s.label}` === currentKey);

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-start sm:gap-8">
      {/* 도넛 차트 */}
      <div className="shrink-0">
        <svg viewBox="0 0 200 200" className="w-52 h-52 sm:w-60 sm:h-60">
          {slices.map((s) => {
            if (s.sweep <= 0) return null;
            const isSelected = `${keyPrefix}${s.label}` === currentKey;
            return (
              <path
                key={s.label}
                d={slicePath(s.startAngle, s.sweep)}
                fill={colorMap.get(s.label) ?? "#9ca3af"}
                stroke="white"
                strokeWidth={2}
                opacity={currentKey && !isSelected ? 0.4 : 1}
                className="cursor-pointer transition-opacity"
                onClick={() => onToggle(`${keyPrefix}${s.label}`)}
              />
            );
          })}
          {/* 중앙 텍스트 */}
          <text x={cx} y={cy - 6} textAnchor="middle" className="fill-foreground text-2xl font-bold">{total}</text>
          <text x={cx} y={cy + 14} textAnchor="middle" className="fill-muted-foreground text-[10px]">전체 교인</text>
        </svg>
      </div>

      {/* 범례 + 선택된 교인 목록 */}
      <div className="flex-1 min-w-0 w-full">
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 sm:grid-cols-1">
          {slices.filter((s) => s.count > 0).map((s) => {
            const key = `${keyPrefix}${s.label}`;
            const isSelected = key === currentKey;
            const pct = total > 0 ? Math.round((s.count / total) * 100) : 0;
            return (
              <button
                key={s.label}
                type="button"
                onClick={() => onToggle(key)}
                className={`flex items-center gap-2 rounded px-1.5 py-0.5 text-left transition-colors text-sm ${isSelected ? "bg-secondary" : "hover:bg-secondary/50"}`}
              >
                <span
                  className="h-3 w-3 shrink-0 rounded-sm"
                  style={{ backgroundColor: colorMap.get(s.label) }}
                />
                <span className="truncate">{s.label}</span>
                <span className="ml-auto shrink-0 text-xs text-muted-foreground">{s.count}명 ({pct}%)</span>
              </button>
            );
          })}
        </div>

        {/* 선택 시 교인 목록 */}
        {selectedSlice && selectedSlice.members.length > 0 && (
          <div className="mt-3 border-t pt-3 space-y-0.5">
            <p className="text-xs font-medium text-muted-foreground mb-1.5">
              {selectedSlice.label} — {selectedSlice.count}명
            </p>
            {selectedSlice.members.map((m) => (
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

  // 주거지별 — 전체 등록교인 기준 (서울 → 경기 → 기타, 각 그룹 내 인원 순)
  const byResidence = useMemo(() => {
    const items = groupMembers(nonRemoved, (m) => getResidenceArea(m.address));
    const regionOrder = (label: string) => {
      if (label === "미입력") return 9;
      if (label.startsWith("서울")) return 0;
      if (label.startsWith("경기")) return 1;
      return 2;
    };
    return items.sort((a, b) => {
      const ra = regionOrder(a.label);
      const rb = regionOrder(b.label);
      if (ra !== rb) return ra - rb;
      return b.count - a.count;
    });
  }, [nonRemoved]);

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
          <>
            <Card>
              <CardContent className="p-5">
                <SectionTitle>주거지별 분포 (전체 등록교인 기준)</SectionTitle>
                <DonutChart
                  items={byResidence}
                  total={nonRemoved.length}
                  expandedKey={expandedKey}
                  onToggle={toggle}
                  keyPrefix="res:"
                />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <SectionTitle>주거지별 상세 (전체 등록교인 기준)</SectionTitle>
                <div className="space-y-1">
                  {byResidence.map((item) => (
                    <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} members={item.members} expanded={expandedKey === `res:${item.label}`} onToggle={() => toggle(`res:${item.label}`)} />
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
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
