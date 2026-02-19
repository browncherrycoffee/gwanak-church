import type { Metadata } from "next";
import { Cross, Eye, Heartbeat, Clock } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: "교회 소개",
  description: "관악교회를 소개합니다. 담임목사 인사말, 비전과 미션, 교회 역사를 확인하세요.",
};

export default function AboutPage() {
  return (
    <>
      <PageHeader
        title="교회 소개"
        description="관악교회를 소개합니다"
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* 담임목사 인사말 */}
        <section className="mb-16">
          <div className="grid gap-8 md:grid-cols-5">
            <div className="flex items-center justify-center rounded-xl bg-secondary p-12 md:col-span-2">
              <div className="flex h-32 w-32 items-center justify-center rounded-full bg-primary/10">
                <Cross weight="thin" className="h-16 w-16 text-primary" />
              </div>
            </div>
            <div className="md:col-span-3">
              <h2 className="text-2xl font-bold">담임목사 인사말</h2>
              <Separator className="my-4" />
              <div className="space-y-4 text-muted-foreground leading-relaxed">
                <p>
                  관악교회 홈페이지를 방문해 주신 여러분을 진심으로 환영합니다.
                </p>
                <p>
                  저희 교회는 하나님의 말씀 위에 세워진 교회로서, 예배와 말씀, 기도와 교제를
                  통해 하나님 나라를 이루어가는 공동체입니다.
                </p>
                <p>
                  어디에 계시든, 어떤 상황에 있으시든, 하나님의 사랑과 은혜 안에서 새로운 소망을
                  발견하시길 기도합니다. 관악교회가 여러분의 신앙의 동반자가 되겠습니다.
                </p>
                <p className="font-medium text-foreground">관악교회 담임목사 드림</p>
              </div>
            </div>
          </div>
        </section>

        {/* 비전과 미션 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">비전과 미션</h2>
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="text-center">
              <CardContent className="pt-8 pb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <Eye weight="light" className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">비전</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  하나님을 사랑하고, 이웃을 사랑하며, 세상을 섬기는 교회
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8 pb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <Heartbeat weight="light" className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">미션</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  예배, 양육, 봉사, 선교를 통해 그리스도의 제자를 세우는 교회
                </p>
              </CardContent>
            </Card>
            <Card className="text-center">
              <CardContent className="pt-8 pb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
                  <Cross weight="light" className="h-7 w-7 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-2">핵심 가치</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  말씀 중심, 기도 중심, 성령 중심의 신앙 공동체
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* 교회 역사 */}
        <section>
          <h2 className="text-2xl font-bold mb-8">교회 역사</h2>
          <div className="space-y-6">
            {[
              { year: "설립", description: "관악교회 설립 예배" },
              { year: "성장", description: "교회 성장과 성도 증가, 다양한 사역 시작" },
              { year: "현재", description: "지역사회와 함께하는 선교와 봉사의 교회로 성장" },
            ].map((item, index) => (
              <div key={index} className="flex gap-6">
                <div className="flex flex-col items-center">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Clock weight="light" className="h-5 w-5" />
                  </div>
                  {index < 2 && <div className="mt-2 w-px flex-1 bg-border" />}
                </div>
                <div className="pb-6">
                  <h3 className="font-semibold text-primary">{item.year}</h3>
                  <p className="mt-1 text-muted-foreground">{item.description}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
