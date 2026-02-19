import Link from "next/link";
import { ArrowRight, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/shared/section-header";

const sampleAnnouncements = [
  {
    id: "1",
    title: "2026년 사순절 특별 새벽기도회 안내",
    category: "예배",
    date: "2026.02.18",
    summary: "사순절 기간 동안 매일 새벽 5시 30분에 특별 새벽기도회가 진행됩니다.",
  },
  {
    id: "2",
    title: "교회 봄맞이 대청소 봉사",
    category: "행사",
    date: "2026.02.15",
    summary: "3월 첫째 주 토요일에 교회 봄맞이 대청소를 진행합니다. 많은 참여 바랍니다.",
  },
  {
    id: "3",
    title: "주일학교 교사 모집",
    category: "교육",
    date: "2026.02.12",
    summary: "새 학기를 맞아 주일학교 교사를 모집합니다. 관심 있으신 분은 교육부로 문의해 주세요.",
  },
];

export function UpcomingEvents() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <div className="flex items-end justify-between mb-8">
        <SectionHeader
          title="교회 소식"
          description="관악교회의 최근 소식을 전합니다"
          className="mb-0"
        />
        <Button asChild variant="ghost" className="hidden sm:flex">
          <Link href="/announcements">
            전체 보기
            <ArrowRight weight="light" className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {sampleAnnouncements.map((item) => (
          <Link key={item.id} href={`/announcements/${item.id}`}>
            <Card className="group h-full transition-colors hover:border-primary/30">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant="outline">{item.category}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarBlank weight="light" className="h-3 w-3" />
                    {item.date}
                  </span>
                </div>
                <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                  {item.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                  {item.summary}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
      <div className="mt-4 text-center sm:hidden">
        <Button asChild variant="ghost">
          <Link href="/announcements">
            전체 공지사항 보기
            <ArrowRight weight="light" className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
}
