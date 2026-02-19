import type { Metadata } from "next";
import Link from "next/link";
import { CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "공지사항",
  description: "관악교회의 공지사항과 소식을 확인하세요.",
};

const announcements = [
  {
    id: "1",
    title: "2026년 사순절 특별 새벽기도회 안내",
    category: "예배",
    date: "2026.02.18",
    summary:
      "사순절 기간 동안 매일 새벽 5시 30분에 특별 새벽기도회가 진행됩니다. 성도 여러분의 많은 참여를 부탁드립니다.",
    isPinned: true,
  },
  {
    id: "2",
    title: "교회 봄맞이 대청소 봉사",
    category: "행사",
    date: "2026.02.15",
    summary:
      "3월 첫째 주 토요일에 교회 봄맞이 대청소를 진행합니다. 봉사에 참여를 원하시는 분은 사무실로 연락 바랍니다.",
    isPinned: false,
  },
  {
    id: "3",
    title: "주일학교 교사 모집",
    category: "교육",
    date: "2026.02.12",
    summary:
      "새 학기를 맞아 주일학교 교사를 모집합니다. 아이들과 함께 신앙의 여정을 걸어가실 분들의 지원을 기다립니다.",
    isPinned: false,
  },
  {
    id: "4",
    title: "2월 구역 모임 일정 안내",
    category: "일반",
    date: "2026.02.10",
    summary:
      "2월 구역 모임은 각 구역별로 진행됩니다. 자세한 일정은 각 구역장에게 문의해 주세요.",
    isPinned: false,
  },
  {
    id: "5",
    title: "성가대원 모집",
    category: "일반",
    date: "2026.02.08",
    summary:
      "찬양으로 하나님을 섬기고 싶은 분들을 기다립니다. 매주 토요일 오후 3시에 연습이 있습니다.",
    isPinned: false,
  },
];

export default function AnnouncementsPage() {
  return (
    <>
      <PageHeader
        title="공지사항"
        description="관악교회의 소식과 안내를 전합니다"
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="space-y-4">
          {announcements.map((item) => (
            <Link key={item.id} href={`/announcements/${item.id}`}>
              <Card className="group transition-colors hover:border-primary/30">
                <CardContent className="p-6">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    {item.isPinned && (
                      <Badge className="bg-primary">중요</Badge>
                    )}
                    <Badge variant="outline">{item.category}</Badge>
                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                      <CalendarBlank weight="light" className="h-3 w-3" />
                      {item.date}
                    </span>
                  </div>
                  <h3 className="text-lg font-semibold group-hover:text-primary transition-colors">
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
      </div>
    </>
  );
}
