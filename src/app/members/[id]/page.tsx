"use client";

import { use, useState, useSyncExternalStore } from "react";
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
  ToggleLeft,
  ToggleRight,
  Printer,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getMember, deleteMember, toggleMemberStatus, getMembers, subscribe } from "@/lib/member-store";
import { formatDate } from "@/lib/utils";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

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
    deleteMember(id);
    router.push("/members");
  };

  const fullAddress = [member.address, member.detailAddress].filter(Boolean).join(" ");
  const infoRows = [
    { icon: Phone, label: "연락처", value: member.phone, linkType: "phone" as const },
    { icon: MapPin, label: "주소", value: fullAddress || null, linkType: "address" as const },
    { icon: CalendarBlank, label: "생년월일", value: member.birthDate ? formatDate(member.birthDate) : null, linkType: "none" as const },
    { icon: User, label: "성별", value: member.gender, linkType: "none" as const },
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
    { icon: CrossIcon, label: "세례받은 교회", value: member.baptismChurch },
    { icon: CalendarBlank, label: "세례교인회원가입일", value: member.memberJoinDate ? formatDate(member.memberJoinDate) : null },
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
          <div className="flex gap-1.5 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print">
              <Printer weight="light" className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">인쇄</span>
            </Button>
            <Button asChild variant="outline" size="sm">
              <Link href={`/members/${id}/edit`}>
                <PencilSimple weight="light" className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">수정</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="text-destructive hover:text-destructive">
              <Trash weight="light" className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">삭제</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 프로필 헤더 */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-secondary text-primary">
              <User weight="light" className="h-8 w-8" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold">{member.name}</h1>
                {member.position && (
                  <Badge className="bg-primary">{member.position}</Badge>
                )}
                {member.memberStatus !== "활동" && (
                  <Badge variant="outline" className={member.memberStatus === "제적" ? "text-destructive border-destructive/30" : ""}>
                    {member.memberStatus}
                  </Badge>
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
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleMemberStatus(id)}
            className={member.memberStatus === "활동" ? "text-primary" : "text-muted-foreground"}
          >
            {member.memberStatus === "활동" ? (
              <ToggleRight weight="fill" className="mr-1.5 h-5 w-5" />
            ) : (
              <ToggleLeft weight="light" className="mr-1.5 h-5 w-5" />
            )}
            {member.memberStatus}
          </Button>
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
                      {row.linkType === "phone" ? (
                        <a
                          href={`tel:${row.value}`}
                          className="text-sm text-primary hover:underline"
                        >
                          {row.value}
                        </a>
                      ) : row.linkType === "address" ? (
                        <a
                          href={`https://map.naver.com/v5/search/${encodeURIComponent(row.value)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                        >
                          {row.value}
                        </a>
                      ) : (
                        <p className="text-sm">{row.value}</p>
                      )}
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
          {(member.familyHead || member.relationship) && (() => {
            const familyMembers = member.familyHead
              ? getMembers().filter((m) => m.familyHead === member.familyHead && m.id !== member.id)
              : [];
            return (
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
                  {familyMembers.length > 0 && (
                    <div className="mt-4 pt-4 border-t">
                      <p className="text-xs text-muted-foreground mb-2">같은 세대 교인</p>
                      <div className="space-y-2">
                        {familyMembers.map((fm) => (
                          <Link
                            key={fm.id}
                            href={`/members/${fm.id}`}
                            className="flex items-center gap-2 rounded-md p-2 -mx-2 hover:bg-secondary transition-colors"
                          >
                            <User weight="light" className="h-4 w-4 text-primary shrink-0" />
                            <span className="text-sm font-medium">{fm.name}</span>
                            {fm.relationship && (
                              <span className="text-xs text-muted-foreground">({fm.relationship})</span>
                            )}
                            {fm.position && (
                              <Badge variant="secondary" className="text-[10px] ml-auto">
                                {fm.position}
                              </Badge>
                            )}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })()}

          {/* 세례 정보 */}
          {(member.baptismType || member.baptismDate || member.baptismChurch || member.memberJoinDate) && (
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

      <ConfirmDialog
        open={showDeleteDialog}
        title="교적 삭제"
        description={`${member.name} 교인의 교적을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`}
        confirmLabel="삭제"
        cancelLabel="취소"
        destructive
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteDialog(false)}
      />
    </div>
  );
}
