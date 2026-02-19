import type { Metadata } from "next";
import { MapPin, Train, Bus, Car, Phone } from "@phosphor-icons/react/dist/ssr";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { SITE_CONFIG } from "@/lib/constants";

export const metadata: Metadata = {
  title: "오시는 길",
  description: "관악교회 위치와 교통편을 안내합니다.",
};

const transitInfo = [
  {
    icon: Train,
    title: "지하철",
    details: [
      "2호선 서울대입구역 3번 출구에서 도보 10분",
    ],
  },
  {
    icon: Bus,
    title: "버스",
    details: [
      "관악구청 정류장 하차",
      "간선: 501, 502, 750",
      "지선: 5511, 5513",
    ],
  },
  {
    icon: Car,
    title: "자가용",
    details: [
      "교회 전용 주차장 이용 가능",
      "주일에는 주차 공간이 제한될 수 있습니다",
    ],
  },
];

export default function DirectionsPage() {
  return (
    <>
      <PageHeader
        title="오시는 길"
        description="관악교회로 오시는 방법을 안내합니다"
      />
      <div className="mx-auto max-w-6xl px-4 py-12">
        {/* 지도 */}
        <Card className="mb-8 overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-center bg-muted h-80 md:h-96">
              <div className="text-center">
                <MapPin weight="light" className="mx-auto h-12 w-12 text-primary/40" />
                <p className="mt-4 text-sm text-muted-foreground">
                  지도가 여기에 표시됩니다
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  (Naver/Kakao 지도 연동 예정)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 주소 */}
        <Card className="mb-8">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <MapPin weight="light" className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-semibold">주소</h3>
              <p className="text-sm text-muted-foreground">{SITE_CONFIG.address}</p>
            </div>
          </CardContent>
        </Card>

        {/* 교통편 */}
        <h2 className="text-xl font-bold mb-4">교통편 안내</h2>
        <div className="grid gap-4 md:grid-cols-3">
          {transitInfo.map((info) => (
            <Card key={info.title}>
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary">
                    <info.icon weight="light" className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">{info.title}</h3>
                </div>
                <ul className="space-y-2">
                  {info.details.map((detail, index) => (
                    <li key={index} className="text-sm text-muted-foreground">
                      {detail}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 연락처 */}
        <Card className="mt-8">
          <CardContent className="flex items-center gap-4 p-6">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Phone weight="light" className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold">문의</h3>
              <p className="text-sm text-muted-foreground">
                찾아오시는 길이 어려우시면 교회 사무실({SITE_CONFIG.phone})로 연락해 주세요.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
