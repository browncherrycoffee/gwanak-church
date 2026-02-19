import type { Metadata } from "next";
import Link from "next/link";
import {
  HandWaving,
  NumberCircleOne,
  NumberCircleTwo,
  NumberCircleThree,
  NumberCircleFour,
  Cross,
  ArrowRight,
} from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "새가족 안내",
  description: "관악교회에 처음 오시는 분들을 위한 안내입니다.",
};

const steps = [
  {
    icon: NumberCircleOne,
    title: "예배에 참석하세요",
    description:
      "주일 예배에 편하게 오세요. 안내위원이 좌석과 예배 순서를 안내해 드립니다.",
  },
  {
    icon: NumberCircleTwo,
    title: "새가족 등록을 해주세요",
    description:
      "예배 후 새가족 등록 카드를 작성해 주시면, 담당 교역자가 연락을 드립니다.",
  },
  {
    icon: NumberCircleThree,
    title: "새가족 교육에 참여하세요",
    description:
      "4주간의 새가족 교육을 통해 관악교회의 비전과 사역에 대해 알아보실 수 있습니다.",
  },
  {
    icon: NumberCircleFour,
    title: "소그룹에 참여하세요",
    description:
      "구역 모임이나 소그룹에 참여하여 성도들과 교제하며 신앙이 성장하는 기쁨을 누리세요.",
  },
];

const faqs = [
  {
    question: "주차가 가능한가요?",
    answer:
      "네, 교회 전용 주차장을 이용하실 수 있습니다. 주일에는 주차 공간이 제한될 수 있으니 대중교통 이용을 권장합니다.",
  },
  {
    question: "어린 자녀를 데려와도 되나요?",
    answer:
      "물론입니다! 주일학교와 영아부가 운영되고 있어 자녀분들도 함께 예배를 드릴 수 있습니다.",
  },
  {
    question: "어떤 옷을 입고 가야 하나요?",
    answer:
      "편한 복장으로 오시면 됩니다. 정장이 아니어도 전혀 상관없습니다.",
  },
];

export default function NewcomersPage() {
  return (
    <>
      <PageHeader
        title="새가족 안내"
        description="관악교회에 처음 오신 분들을 환영합니다"
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* 환영 메시지 */}
        <div className="mb-12 rounded-2xl bg-secondary p-8 text-center md:p-12">
          <HandWaving weight="light" className="mx-auto mb-4 h-12 w-12 text-primary" />
          <h2 className="text-2xl font-bold">환영합니다!</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground leading-relaxed">
            관악교회에 처음 방문하시는 모든 분들을 진심으로 환영합니다.
            우리 교회는 누구나 편안하게 하나님을 만날 수 있는 곳이 되기를 소망합니다.
            아래 안내를 참고하시어 편안한 마음으로 방문해 주세요.
          </p>
        </div>

        {/* 등록 과정 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">등록 과정</h2>
          <div className="grid gap-6 md:grid-cols-2">
            {steps.map((step) => (
              <Card key={step.title}>
                <CardContent className="flex gap-4 p-6">
                  <div className="shrink-0">
                    <step.icon weight="light" className="h-10 w-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{step.title}</h3>
                    <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* 자주 묻는 질문 */}
        <section className="mb-16">
          <h2 className="text-2xl font-bold mb-8 text-center">자주 묻는 질문</h2>
          <div className="space-y-4">
            {faqs.map((faq) => (
              <Card key={faq.question}>
                <CardContent className="p-6">
                  <h3 className="font-semibold">{faq.question}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="text-center rounded-2xl bg-primary p-8 md:p-12">
          <Cross weight="thin" className="mx-auto mb-4 h-10 w-10 text-primary-foreground/70" />
          <h2 className="text-2xl font-bold text-primary-foreground">
            이번 주일, 관악교회에서 만나요
          </h2>
          <p className="mt-2 text-primary-foreground/70">
            예배 시간과 장소를 확인하세요
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="bg-primary-foreground text-primary hover:bg-primary-foreground/90"
            >
              <Link href="/worship">
                예배 안내
                <ArrowRight weight="light" className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
            >
              <Link href="/directions">오시는 길</Link>
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
