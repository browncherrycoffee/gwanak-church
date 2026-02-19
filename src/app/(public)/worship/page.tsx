import type { Metadata } from "next";
import { Clock, MapPin, Cross } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "예배 안내",
  description: "관악교회 예배 시간과 장소를 안내합니다.",
};

const services = [
  {
    name: "주일 1부 예배",
    day: "주일",
    time: "오전 9:00",
    location: "본당",
    description: "새벽같이 드리는 첫 번째 예배",
    type: "주일",
  },
  {
    name: "주일 2부 예배",
    day: "주일",
    time: "오전 11:00",
    location: "본당",
    description: "온 가족이 함께하는 예배",
    type: "주일",
  },
  {
    name: "주일 3부 예배",
    day: "주일",
    time: "오후 2:00",
    location: "본당",
    description: "오후에 드리는 예배",
    type: "주일",
  },
  {
    name: "수요 예배",
    day: "수요일",
    time: "오후 7:30",
    location: "본당",
    description: "한 주의 중심, 말씀과 기도의 시간",
    type: "주중",
  },
  {
    name: "금요 기도회",
    day: "금요일",
    time: "오후 8:00",
    location: "기도실",
    description: "간절한 기도로 한 주를 마무리합니다",
    type: "주중",
  },
  {
    name: "새벽 기도회",
    day: "월~토",
    time: "오전 5:30",
    location: "소예배실",
    description: "매일 아침 말씀과 기도로 시작합니다",
    type: "매일",
  },
];

export default function WorshipPage() {
  return (
    <>
      <PageHeader
        title="예배 안내"
        description="관악교회의 예배 시간과 장소를 안내합니다"
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {services.map((service) => (
            <Card key={service.name} className="group hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <Badge
                    variant={service.type === "주일" ? "default" : "secondary"}
                    className={service.type === "주일" ? "bg-primary" : ""}
                  >
                    {service.day}
                  </Badge>
                  <Cross weight="thin" className="h-5 w-5 text-primary/30" />
                </div>
                <h3 className="text-lg font-semibold">{service.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  {service.description}
                </p>
                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <Clock weight="light" className="h-4 w-4 text-primary" />
                    <span>{service.time}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin weight="light" className="h-4 w-4 text-primary" />
                    <span>{service.location}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 rounded-xl bg-secondary/50 p-8 text-center">
          <Cross weight="thin" className="mx-auto mb-4 h-8 w-8 text-primary" />
          <h3 className="text-lg font-semibold">처음 오시는 분들을 환영합니다</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            예배 시간 10분 전까지 오시면 안내위원이 좌석을 안내해 드립니다.
          </p>
        </div>
      </div>
    </>
  );
}
