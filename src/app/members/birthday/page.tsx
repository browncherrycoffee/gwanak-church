"use client";

import { useState, useMemo, useSyncExternalStore } from "react";
import Link from "next/link";
import { Cross, ArrowLeft, Cake, User } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { getMembers, subscribe } from "@/lib/member-store";
import { getBirthMonthDay, daysUntilBirthday } from "@/lib/utils";
import type { Member } from "@/types";

const MONTH_LABELS = [
  "1월", "2월", "3월", "4월", "5월", "6월",
  "7월", "8월", "9월", "10월", "11월", "12월",
] as const;

function getAge(birthDate: string): number | null {
  const today = new Date();
  const birth = new Date(birthDate);
  if (Number.isNaN(birth.getTime())) return null;
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age < 0 ? null : age;
}

function BirthdayCard({
  member,
  today,
  showDDay,
}: {
  member: Member;
  today: Date;
  showDDay: boolean;
}) {
  const md = member.birthDate ? getBirthMonthDay(member.birthDate) : null;
  const age = member.birthDate ? getAge(member.birthDate) : null;
  const days = member.birthDate ? daysUntilBirthday(member.birthDate, today) : null;
  const isToday = days === 0;
  const isThisWeek = days !== null && days <= 7;

  return (
    <Link href={`/members/${member.id}`}>
      <Card
        className={`transition-all hover:border-primary/30 hover:shadow-sm ${
          isToday ? "border-primary bg-primary/5" : isThisWeek ? "border-primary/30" : ""
        }`}
      >
        <CardContent className="flex items-center gap-3 p-4">
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold ${
              isThisWeek
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-primary"
            }`}
          >
            {md?.day}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium">{member.name}</span>
              {member.position && (
                <Badge variant="secondary" className="text-xs">
                  {member.position}
                </Badge>
              )}
              {showDDay && days !== null && isThisWeek && (
                <Badge variant="default" className="text-xs">
                  {isToday ? "오늘" : `D-${days}`}
                </Badge>
              )}
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {md?.month}월 {md?.day}일
              {age !== null && ` · 만 ${age}세`}
              {member.department && ` · ${member.department}`}
            </p>
          </div>
          <User weight="light" className="h-4 w-4 shrink-0 text-muted-foreground" />
        </CardContent>
      </Card>
    </Link>
  );
}

export default function BirthdayPage() {
  const members = useSyncExternalStore(subscribe, getMembers, getMembers);
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);
  const currentMonth = today.getMonth() + 1;
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);

  const withBirthday = useMemo(
    () =>
      members.filter(
        (m) => m.memberStatus !== "제적" && m.birthDate && getBirthMonthDay(m.birthDate),
      ),
    [members],
  );

  const thisWeek = useMemo(
    () =>
      withBirthday
        .filter((m) => m.birthDate && daysUntilBirthday(m.birthDate, today) <= 7)
        .sort((a, b) => {
          const da = a.birthDate ? daysUntilBirthday(a.birthDate, today) : 999;
          const db = b.birthDate ? daysUntilBirthday(b.birthDate, today) : 999;
          return da - db;
        }),
    [withBirthday, today],
  );

  const monthMembers = useMemo(
    () =>
      withBirthday
        .filter((m) => {
          const md = m.birthDate ? getBirthMonthDay(m.birthDate) : null;
          return md && md.month === selectedMonth;
        })
        .sort((a, b) => {
          const da = a.birthDate ? (getBirthMonthDay(a.birthDate)?.day ?? 0) : 0;
          const db = b.birthDate ? (getBirthMonthDay(b.birthDate)?.day ?? 0) : 0;
          return da - db;
        }),
    [withBirthday, selectedMonth],
  );

  const countByMonth = useMemo(() => {
    const counts = new Array<number>(12).fill(0);
    for (const m of withBirthday) {
      const md = m.birthDate ? getBirthMonthDay(m.birthDate) : null;
      if (md) {
        const idx = md.month - 1;
        counts[idx] = (counts[idx] ?? 0) + 1;
      }
    }
    return counts;
  }, [withBirthday]);

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
            <Cake weight="light" className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">생일 목록</h1>
          </div>
          <div className="w-16" />
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 이번 주 생일 */}
        {thisWeek.length > 0 && (
          <section className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
              <Cake weight="fill" className="h-4 w-4" />
              이번 주 생일 ({thisWeek.length}명)
            </h2>
            <div className="space-y-2">
              {thisWeek.map((m) => (
                <BirthdayCard key={m.id} member={m} today={today} showDDay />
              ))}
            </div>
          </section>
        )}

        {/* 월 선택 탭 */}
        <div className="-mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
          {MONTH_LABELS.map((label, i) => {
            const month = i + 1;
            const count = countByMonth[i] ?? 0;
            return (
              <button
                key={month}
                type="button"
                onClick={() => setSelectedMonth(month)}
                className={`flex shrink-0 flex-col items-center rounded-lg px-3 py-2 text-sm transition-colors ${
                  selectedMonth === month
                    ? "bg-primary text-primary-foreground"
                    : month === currentMonth
                      ? "bg-primary/10 font-medium text-primary"
                      : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{label}</span>
                <span className="text-[10px] opacity-70">{count}명</span>
              </button>
            );
          })}
        </div>

        {/* 선택 월 생일 목록 */}
        <section>
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">
            {selectedMonth}월 생일 ({monthMembers.length}명)
          </h2>
          {monthMembers.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              이 달에 생일인 교인이 없습니다.
            </p>
          ) : (
            <div className="space-y-2">
              {monthMembers.map((m) => (
                <BirthdayCard key={m.id} member={m} today={today} showDDay={false} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
