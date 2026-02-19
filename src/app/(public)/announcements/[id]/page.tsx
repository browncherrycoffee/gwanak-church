import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, CalendarBlank } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

const announcements: Record<string, {
  title: string;
  category: string;
  date: string;
  content: string;
}> = {
  "1": {
    title: "2026년 사순절 특별 새벽기도회 안내",
    category: "예배",
    date: "2026.02.18",
    content: `사랑하는 성도 여러분,

사순절을 맞이하여 특별 새벽기도회를 진행합니다.

기간: 2026년 2월 18일 ~ 4월 4일
시간: 매일 새벽 5시 30분
장소: 소예배실

사순절은 예수님의 고난과 부활을 묵상하며 자신을 돌아보는 거룩한 시간입니다.
매일 새벽, 말씀과 기도로 주님께 더 가까이 나아가는 은혜의 시간이 되길 바랍니다.

성도 여러분의 많은 참여를 부탁드립니다.`,
  },
  "2": {
    title: "교회 봄맞이 대청소 봉사",
    category: "행사",
    date: "2026.02.15",
    content: `교회 봄맞이 대청소를 아래와 같이 진행합니다.

일시: 2026년 3월 7일 (토) 오전 9시
장소: 교회 전체
준비물: 편한 복장, 장갑

봉사에 참여를 원하시는 분은 교회 사무실로 연락 바랍니다.
함께 깨끗한 예배 환경을 만들어 가요!`,
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const announcement = announcements[id];
  return {
    title: announcement?.title ?? "공지사항",
    description: announcement?.content.slice(0, 100),
  };
}

export default async function AnnouncementDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const announcement = announcements[id];

  if (!announcement) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">공지사항을 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted-foreground">요청하신 공지사항이 존재하지 않습니다.</p>
        <Button asChild className="mt-6">
          <Link href="/announcements">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/announcements">
          <ArrowLeft weight="light" className="mr-2 h-4 w-4" />
          목록으로
        </Link>
      </Button>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="outline">{announcement.category}</Badge>
        <span className="flex items-center gap-1 text-sm text-muted-foreground">
          <CalendarBlank weight="light" className="h-4 w-4" />
          {announcement.date}
        </span>
      </div>

      <h1 className="text-3xl font-bold">{announcement.title}</h1>

      <Separator className="my-6" />

      <div className="prose prose-neutral max-w-none">
        {announcement.content.split("\n").map((line, i) => (
          <p key={i} className={line.trim() === "" ? "h-4" : "text-muted-foreground leading-relaxed"}>
            {line}
          </p>
        ))}
      </div>

      <Separator className="my-8" />

      <Button asChild variant="outline">
        <Link href="/announcements">
          <ArrowLeft weight="light" className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Link>
      </Button>
    </div>
  );
}
