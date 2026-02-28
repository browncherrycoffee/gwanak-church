"use client";

import { useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  UsersThree,
  ChartBar,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMembers, subscribe } from "@/lib/member-store";
import { POSITION_ORDER, DEPARTMENTS, BAPTISM_TYPES } from "@/lib/constants";

function StatBar({ label, count, total, color = "bg-primary" }: {
  label: string;
  count: number;
  total: number;
  color?: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
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

export default function StatsPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);

  const active = useMemo(() => members.filter((m) => m.memberStatus === "활동"), [members]);
  const nonRemoved = useMemo(() => members.filter((m) => m.memberStatus !== "제적"), [members]);

  // 직분별
  const byPosition = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of nonRemoved) {
      const key = m.position || "미입력";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const ordered: { label: string; count: number }[] = [];
    for (const pos of POSITION_ORDER) {
      const count = map.get(pos);
      if (count) ordered.push({ label: pos, count });
      map.delete(pos);
    }
    for (const [label, count] of map) {
      ordered.push({ label, count });
    }
    return ordered;
  }, [nonRemoved]);

  // 소속(부서)별 — 활동 교인 기준
  const byDepartment = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of active) {
      const key = m.department || "미배정";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const ordered: { label: string; count: number }[] = [];
    for (const dept of DEPARTMENTS) {
      const count = map.get(dept);
      if (count) ordered.push({ label: dept, count });
      map.delete(dept);
    }
    for (const [label, count] of map) {
      ordered.push({ label, count });
    }
    return ordered.sort((a, b) => b.count - a.count);
  }, [active]);

  // 성별
  const byGender = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of nonRemoved) {
      const key = m.gender || "미입력";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return [
      { label: "남", count: map.get("남") ?? 0 },
      { label: "여", count: map.get("여") ?? 0 },
      { label: "미입력", count: map.get("미입력") ?? 0 },
    ].filter((x) => x.count > 0);
  }, [nonRemoved]);

  // 세례 종류별
  const byBaptism = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of nonRemoved) {
      const key = m.baptismType || "미입력";
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const ordered: { label: string; count: number }[] = [];
    for (const bt of BAPTISM_TYPES) {
      const count = map.get(bt);
      if (count) ordered.push({ label: bt, count });
      map.delete(bt);
    }
    for (const [label, count] of map) {
      ordered.push({ label, count });
    }
    return ordered;
  }, [nonRemoved]);

  // 연령대별
  const byAge = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of nonRemoved) {
      const key = getAgeGroup(m.birthDate);
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return AGE_GROUP_ORDER
      .map((label) => ({ label, count: map.get(label) ?? 0 }))
      .filter((x) => x.count > 0);
  }, [nonRemoved]);

  // 구역별 — 활동 교인 기준
  const byDistrict = useMemo(() => {
    const map = new Map<string, number>();
    for (const m of active) {
      if (m.district) map.set(m.district, (map.get(m.district) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0], "ko"))
      .map(([label, count]) => ({ label, count }));
  }, [active]);

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
            <div className="space-y-2.5">
              {byPosition.map((item) => (
                <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 성별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>성별 분포 (전체 등록교인 기준)</SectionTitle>
            <div className="space-y-2.5">
              {byGender.map((item) => (
                <StatBar
                  key={item.label}
                  label={item.label}
                  count={item.count}
                  total={nonRemoved.length}
                  color={item.label === "남" ? "bg-blue-500" : item.label === "여" ? "bg-rose-400" : "bg-muted-foreground"}
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
              <div className="space-y-2.5">
                {byAge.map((item) => (
                  <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 소속(부서)별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>소속별 분포 (출석 교인 기준)</SectionTitle>
            <div className="space-y-2.5">
              {byDepartment.map((item) => (
                <StatBar key={item.label} label={item.label} count={item.count} total={active.length} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 구역별 */}
        {byDistrict.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <SectionTitle>구역별 분포 (출석 교인 기준)</SectionTitle>
              <div className="space-y-2.5">
                {byDistrict.map((item) => (
                  <StatBar key={item.label} label={item.label} count={item.count} total={active.length} />
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 세례 종류별 */}
        <Card>
          <CardContent className="p-5">
            <SectionTitle>세례 종류별 (전체 등록교인 기준)</SectionTitle>
            <div className="space-y-2.5">
              {byBaptism.map((item) => (
                <StatBar key={item.label} label={item.label} count={item.count} total={nonRemoved.length} />
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
