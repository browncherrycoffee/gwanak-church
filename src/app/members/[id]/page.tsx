"use client";

import { use, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  PencilSimple,
  Trash,
  User,
  Phone,
  MapPin,
  CalendarBlank,
  Cross as CrossIcon,
  Tag,
  UsersThree,
  Note,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getMember, deleteMember, getMembers, subscribe } from "@/lib/member-store";
import { formatDate } from "@/lib/utils";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  // subscribe to store changes
  useSyncExternalStore(subscribe, getMembers, getMembers);
  const member = getMember(id);

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <User weight="thin" className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="font-medium">교인 정보를 찾을 수 없습니다</p>
          <Button asChild className="mt-4">
            <Link href="/members">목록으로</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleDelete = () => {
    if (window.confirm(`${member.name} 교인의 교적을 삭제하시겠습니까?`)) {
      deleteMember(id);
      router.push("/members");
    }
  };

  const infoRows = [
    { icon: Phone, label: "연락처", value: member.phone },
    { icon: MapPin, label: "주소", value: [member.address, member.detailAddress].filter(Boolean).join(" ") },
    { icon: CalendarBlank, label: "생년월일", value: member.birthDate ? formatDate(member.birthDate) : null },
    { icon: User, label: "성별", value: member.gender },
  ];

  const churchRows = [
    { icon: Tag, label: "직분", value: member.position },
    { icon: UsersThree, label: "소속", value: [member.department, member.district].filter(Boolean).join(" / ") },
    { icon: CalendarBlank, label: "등록일", value: member.registrationDate ? formatDate(member.registrationDate) : null },
  ];

  const familyRows = [
    { icon: UsersThree, label: "세대주", value: member.familyHead },
    { icon: User, label: "관계", value: member.relationship },
  ];

  const baptismRows = [
    { icon: CrossIcon, label: "세례 종류", value: member.baptismType },
    { icon: CalendarBlank, label: "세례일", value: member.baptismDate ? formatDate(member.baptismDate) : null },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="shrink-0">
              <Cross weight="fill" className="h-7 w-7 text-primary" />
            </Link>
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">
                <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
                목록
              </Link>
            </Button>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" size="sm">
              <Link href={`/members/${id}/edit`}>
                <PencilSimple weight="light" className="mr-1.5 h-4 w-4" />
                수정
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={handleDelete} className="text-destructive hover:text-destructive">
              <Trash weight="light" className="mr-1.5 h-4 w-4" />
              삭제
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 프로필 헤더 */}
        <div className="mb-6 flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
            <User weight="light" className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold">{member.name}</h1>
              {member.position && (
                <Badge className="bg-primary">{member.position}</Badge>
              )}
              {!member.isActive && (
                <Badge variant="outline">비활동</Badge>
              )}
            </div>
            {member.department && (
              <p className="mt-1 text-muted-foreground">
                {member.department}
                {member.district ? ` / ${member.district}` : ""}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          {/* 기본 정보 */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">기본 정보</h2>
              <div className="space-y-3">
                {infoRows.map((row) => row.value && (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon weight="light" className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 교회 정보 */}
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">교회 정보</h2>
              <div className="space-y-3">
                {churchRows.map((row) => row.value && (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon weight="light" className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 가족 정보 */}
          {(member.familyHead || member.relationship) && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4">가족 정보</h2>
                <div className="space-y-3">
                  {familyRows.map((row) => row.value && (
                    <div key={row.label} className="flex items-start gap-3">
                      <row.icon weight="light" className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="text-sm">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 세례 정보 */}
          {(member.baptismType || member.baptismDate) && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4">세례 정보</h2>
                <div className="space-y-3">
                  {baptismRows.map((row) => row.value && (
                    <div key={row.label} className="flex items-start gap-3">
                      <row.icon weight="light" className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                      <div>
                        <p className="text-xs text-muted-foreground">{row.label}</p>
                        <p className="text-sm">{row.value}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 비고 */}
          {member.notes && (
            <Card>
              <CardContent className="p-5">
                <h2 className="text-sm font-semibold text-muted-foreground mb-4">비고</h2>
                <div className="flex items-start gap-3">
                  <Note weight="light" className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-sm whitespace-pre-wrap">{member.notes}</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
