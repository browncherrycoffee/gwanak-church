import type { Metadata } from "next";
import Link from "next/link";
import { Play, CalendarBlank, BookOpen } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "설교",
  description: "관악교회 설교 영상과 음성을 들으실 수 있습니다.",
};

const sermons = [
  {
    id: "1",
    title: "하나님의 은혜 안에서",
    preacher: "담임목사",
    scripture: "로마서 8:28-30",
    date: "2026.02.16",
    category: "주일설교",
    summary: "모든 것이 합력하여 선을 이루시는 하나님의 섭리와 은혜에 대한 말씀입니다.",
  },
  {
    id: "2",
    title: "믿음의 사람들",
    preacher: "담임목사",
    scripture: "히브리서 11:1-6",
    date: "2026.02.09",
    category: "주일설교",
    summary: "믿음이란 무엇인지, 믿음의 선진들을 통해 배우는 참된 신앙의 모습입니다.",
  },
  {
    id: "3",
    title: "기도의 능력",
    preacher: "부목사",
    scripture: "마태복음 6:5-13",
    date: "2026.02.11",
    category: "수요설교",
    summary: "주기도문을 통해 배우는 기도의 본질과 능력에 대한 말씀입니다.",
  },
  {
    id: "4",
    title: "사랑의 실천",
    preacher: "담임목사",
    scripture: "고린도전서 13:1-13",
    date: "2026.02.02",
    category: "주일설교",
    summary: "사랑장을 통해 배우는 그리스도인의 사랑의 삶에 대한 말씀입니다.",
  },
  {
    id: "5",
    title: "소망 가운데 기뻐하라",
    preacher: "담임목사",
    scripture: "로마서 12:9-21",
    date: "2026.01.26",
    category: "주일설교",
    summary: "환난 중에도 소망을 잃지 않고 기뻐하는 그리스도인의 삶에 대한 말씀입니다.",
  },
  {
    id: "6",
    title: "영적 전투와 승리",
    preacher: "부목사",
    scripture: "에베소서 6:10-18",
    date: "2026.02.04",
    category: "수요설교",
    summary: "하나님의 전신갑주를 입고 영적 싸움에서 승리하는 방법에 대한 말씀입니다.",
  },
];

export default function SermonsPage() {
  return (
    <>
      <PageHeader
        title="설교"
        description="은혜로운 말씀을 다시 들으실 수 있습니다"
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sermons.map((sermon) => (
            <Link key={sermon.id} href={`/sermons/${sermon.id}`}>
              <Card className="group h-full transition-colors hover:border-primary/30">
                <CardContent className="p-0">
                  <div className="flex items-center justify-center bg-primary/5 p-8 group-hover:bg-primary/10 transition-colors">
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                      <Play weight="fill" className="h-6 w-6 text-primary" />
                    </div>
                  </div>
                  <div className="p-5">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <Badge variant="secondary">{sermon.category}</Badge>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <CalendarBlank weight="light" className="h-3 w-3" />
                        {sermon.date}
                      </span>
                    </div>
                    <h3 className="font-semibold group-hover:text-primary transition-colors line-clamp-2">
                      {sermon.title}
                    </h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {sermon.preacher}
                    </p>
                    <div className="mt-2 flex items-center gap-1 text-xs text-primary/70">
                      <BookOpen weight="light" className="h-3 w-3" />
                      <span>{sermon.scripture}</span>
                    </div>
                    <p className="mt-3 text-sm text-muted-foreground line-clamp-2">
                      {sermon.summary}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
