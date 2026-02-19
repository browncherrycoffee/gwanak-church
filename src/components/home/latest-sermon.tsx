import Link from "next/link";
import { Play, ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SectionHeader } from "@/components/shared/section-header";

export function LatestSermon() {
  return (
    <section className="bg-muted/30 py-16">
      <div className="mx-auto max-w-6xl px-4">
        <div className="flex items-end justify-between mb-8">
          <SectionHeader
            title="최근 설교"
            description="가장 최근에 전해진 말씀입니다"
            className="mb-0"
          />
          <Button asChild variant="ghost" className="hidden sm:flex">
            <Link href="/sermons">
              전체 보기
              <ArrowRight weight="light" className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="grid md:grid-cols-2">
              <div className="flex items-center justify-center bg-primary/5 p-12 md:p-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10">
                  <Play weight="fill" className="h-8 w-8 text-primary" />
                </div>
              </div>
              <div className="p-6 md:p-8">
                <Badge variant="secondary" className="mb-3">
                  주일설교
                </Badge>
                <h3 className="text-xl font-bold">
                  하나님의 은혜 안에서
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  담임목사
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  로마서 8:28-30
                </p>
                <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
                  모든 것이 합력하여 선을 이루시는 하나님의 섭리와 은혜에 대한 말씀입니다.
                </p>
                <Button asChild className="mt-6" variant="outline">
                  <Link href="/sermons">
                    설교 듣기
                    <ArrowRight weight="light" className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        <div className="mt-4 text-center sm:hidden">
          <Button asChild variant="ghost">
            <Link href="/sermons">
              전체 설교 보기
              <ArrowRight weight="light" className="ml-1 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
