import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Play, BookOpen, CalendarBlank, User } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

const sermons: Record<string, {
  title: string;
  preacher: string;
  scripture: string;
  date: string;
  category: string;
  summary: string;
}> = {
  "1": {
    title: "하나님의 은혜 안에서",
    preacher: "담임목사",
    scripture: "로마서 8:28-30",
    date: "2026.02.16",
    category: "주일설교",
    summary:
      "우리가 알거니와 하나님을 사랑하는 자 곧 그의 뜻대로 부르심을 입은 자들에게는 모든 것이 합력하여 선을 이루느니라.\n\n이 말씀은 우리의 삶 속에서 일어나는 모든 일들, 기쁜 일이든 어려운 일이든, 하나님의 선하신 계획 안에서 이루어지고 있음을 가르쳐 줍니다.\n\n하나님은 우리를 미리 아시고, 미리 정하시고, 부르시고, 의롭다 하시고, 영화롭게 하셨습니다. 이것이 바로 하나님의 은혜입니다.",
  },
  "2": {
    title: "믿음의 사람들",
    preacher: "담임목사",
    scripture: "히브리서 11:1-6",
    date: "2026.02.09",
    category: "주일설교",
    summary:
      "믿음은 바라는 것들의 실상이요 보이지 않는 것들의 증거입니다.\n\n히브리서 11장의 믿음의 선진들을 통해, 우리는 참된 믿음이 무엇인지 배울 수 있습니다.\n\n믿음 없이는 하나님을 기쁘시게 하지 못합니다. 하나님께 나아가는 자는 반드시 그가 계신 것과 그가 자기를 찾는 자들에게 상 주시는 이심을 믿어야 합니다.",
  },
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const sermon = sermons[id];
  return {
    title: sermon?.title ?? "설교",
    description: sermon ? `${sermon.preacher} | ${sermon.scripture}` : "관악교회 설교",
  };
}

export default async function SermonDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sermon = sermons[id];

  if (!sermon) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-24 text-center">
        <h1 className="text-2xl font-bold">설교를 찾을 수 없습니다</h1>
        <p className="mt-2 text-muted-foreground">요청하신 설교가 존재하지 않습니다.</p>
        <Button asChild className="mt-6">
          <Link href="/sermons">목록으로 돌아가기</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <Button asChild variant="ghost" className="mb-6">
        <Link href="/sermons">
          <ArrowLeft weight="light" className="mr-2 h-4 w-4" />
          목록으로
        </Link>
      </Button>

      {/* 영상 플레이어 영역 */}
      <Card className="mb-8 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-center bg-primary/5 py-20">
            <div className="text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                <Play weight="fill" className="h-8 w-8 text-primary" />
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                영상이 여기에 표시됩니다
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 설교 정보 */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <Badge variant="secondary">{sermon.category}</Badge>
      </div>

      <h1 className="text-3xl font-bold">{sermon.title}</h1>

      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span className="flex items-center gap-1">
          <User weight="light" className="h-4 w-4" />
          {sermon.preacher}
        </span>
        <span className="flex items-center gap-1">
          <CalendarBlank weight="light" className="h-4 w-4" />
          {sermon.date}
        </span>
        <span className="flex items-center gap-1">
          <BookOpen weight="light" className="h-4 w-4" />
          {sermon.scripture}
        </span>
      </div>

      <Separator className="my-6" />

      <div className="space-y-4">
        {sermon.summary.split("\n").map((line, i) => (
          <p key={i} className={line.trim() === "" ? "h-4" : "text-muted-foreground leading-relaxed"}>
            {line}
          </p>
        ))}
      </div>

      <Separator className="my-8" />

      <Button asChild variant="outline">
        <Link href="/sermons">
          <ArrowLeft weight="light" className="mr-2 h-4 w-4" />
          목록으로 돌아가기
        </Link>
      </Button>
    </div>
  );
}
