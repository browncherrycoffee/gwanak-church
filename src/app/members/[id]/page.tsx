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
  Tag,
  UsersThree,
  Note,
  ToggleLeft,
  ToggleRight,
  Printer,
  Plus,
  Heart,
  House,
  Check,
  X,
  CaretDown,
  CaretUp,
} from "@phosphor-icons/react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  getMember,
  deleteMember,
  toggleMemberStatus,
  getMembers,
  subscribe,
  addPrayerRequest,
  deletePrayerRequest,
  updatePrayerRequest,
  addPastoralVisit,
  deletePastoralVisit,
  updatePastoralVisit,
} from "@/lib/member-store";
import { formatDate } from "@/lib/utils";

export default function MemberDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPrayerForm, setShowPrayerForm] = useState(false);
  const [prayerInput, setPrayerInput] = useState("");
  const [editingPrayerId, setEditingPrayerId] = useState<string | null>(null);
  const [editingPrayerText, setEditingPrayerText] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitContent, setVisitContent] = useState("");
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editingVisitDate, setEditingVisitDate] = useState("");
  const [editingVisitText, setEditingVisitText] = useState("");
  const [showAllPrayers, setShowAllPrayers] = useState(false);
  const [showAllVisits, setShowAllVisits] = useState(false);

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
    { icon: Cross, label: "세례 종류", value: member.baptismType },
    { icon: CalendarBlank, label: "세례일", value: member.baptismDate ? formatDate(member.baptismDate) : null },
    { icon: Cross, label: "세례받은 교회", value: member.baptismChurch },
    { icon: CalendarBlank, label: "세례교인회원가입일", value: member.memberJoinDate ? formatDate(member.memberJoinDate) : null },
  ];

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background">
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
            <Button variant="outline" size="sm" onClick={() => window.print()} className="no-print h-9 px-3">
              <Printer weight="light" className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline">인쇄</span>
            </Button>
            <Button asChild variant="outline" size="sm" className="h-9 px-3">
              <Link href={`/members/${id}/edit`}>
                <PencilSimple weight="light" className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">수정</span>
              </Link>
            </Button>
            <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="h-9 px-3 text-destructive hover:text-destructive">
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
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary text-primary overflow-hidden">
              {member.photoUrl ? (
                <Image
                  src={member.photoUrl}
                  alt={member.name}
                  width={64}
                  height={64}
                  className="h-16 w-16 object-cover"
                  unoptimized
                />
              ) : (
                <User weight="light" className="h-8 w-8" />
              )}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
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
          {member.memberStatus !== "제적" && (
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
          )}
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

          {/* 기도제목 */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Heart weight="light" className="h-4 w-4" />
                  기도제목
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-sm"
                  onClick={() => { setShowPrayerForm((v) => !v); setPrayerInput(""); }}
                >
                  <Plus weight="bold" className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
              {showPrayerForm && (
                <div className="mb-4 space-y-2">
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={3}
                    placeholder="기도제목을 입력하세요"
                    value={prayerInput}
                    onChange={(e) => setPrayerInput(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-sm"
                      onClick={() => { setShowPrayerForm(false); setPrayerInput(""); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 text-sm"
                      disabled={!prayerInput.trim()}
                      onClick={() => {
                        if (prayerInput.trim()) {
                          addPrayerRequest(id, prayerInput.trim());
                          setPrayerInput("");
                          setShowPrayerForm(false);
                        }
                      }}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              )}
              {member.prayerRequests.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 기도제목이 없습니다.</p>
              ) : (() => {
                const sorted = [...member.prayerRequests].sort((a, b) =>
                  b.createdAt.localeCompare(a.createdAt)
                );
                const total = sorted.length;

                const renderPrayerItem = (req: (typeof sorted)[number], showYear = false) => (
                  <div key={req.id} className="flex items-start gap-3 group">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground mb-0.5">
                        {/^\d{4}-\d{2}-\d{2}/.test(req.createdAt)
                          ? new Date(req.createdAt).toLocaleDateString("ko-KR",
                              showYear
                                ? { year: "numeric", month: "long", day: "numeric" }
                                : { month: "long", day: "numeric" }
                            )
                          : "날짜 미기재"}
                      </p>
                      {editingPrayerId === req.id ? (
                        <div className="space-y-1.5">
                          <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                            rows={3}
                            value={editingPrayerText}
                            onChange={(e) => setEditingPrayerText(e.target.value)}
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 px-2 text-xs" disabled={!editingPrayerText.trim()}
                              onClick={() => { updatePrayerRequest(id, req.id, editingPrayerText.trim()); setEditingPrayerId(null); }}>
                              <Check weight="bold" className="h-3 w-3 mr-1" />저장
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => setEditingPrayerId(null)}>
                              <X weight="bold" className="h-3 w-3 mr-1" />취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{req.content}</p>
                      )}
                    </div>
                    {editingPrayerId !== req.id && (
                      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingPrayerId(req.id); setEditingPrayerText(req.content); }}>
                          <PencilSimple weight="light" className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deletePrayerRequest(id, req.id)}>
                          <Trash weight="light" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );

                if (!showAllPrayers) {
                  const latest = sorted[0]!;
                  return (
                    <div className="space-y-3">
                      {renderPrayerItem(latest, true)}
                      {total > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowAllPrayers(true)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors pt-1"
                        >
                          <CaretDown weight="bold" className="h-3 w-3" />
                          전체 {total}건 보기
                        </button>
                      )}
                    </div>
                  );
                }

                // 전체 보기: 연도별 그룹
                const yearGroups = new Map<string, typeof sorted>();
                for (const req of sorted) {
                  const year = /^\d{4}/.test(req.createdAt)
                    ? `${req.createdAt.substring(0, 4)}년`
                    : "날짜 미기재";
                  const existing = yearGroups.get(year);
                  if (existing) existing.push(req);
                  else yearGroups.set(year, [req]);
                }
                return (
                  <div className="space-y-6">
                    {[...yearGroups.entries()].map(([year, reqs]) => (
                      <div key={year}>
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs font-bold text-primary">{year}</span>
                          <Badge variant="secondary" className="text-[10px] px-1.5">{reqs.length}건</Badge>
                          <div className="flex-1 h-px bg-border" />
                        </div>
                        <div className="space-y-3">
                          {reqs.map((req) => renderPrayerItem(req, false))}
                        </div>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => setShowAllPrayers(false)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                    >
                      <CaretUp weight="bold" className="h-3 w-3" />
                      접기
                    </button>
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* 심방 기록 */}
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <House weight="light" className="h-4 w-4" />
                  심방 기록
                </h2>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-9 px-3 text-sm"
                  onClick={() => { setShowVisitForm((v) => !v); setVisitDate(""); setVisitContent(""); }}
                >
                  <Plus weight="bold" className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
              {showVisitForm && (
                <div className="mb-4 space-y-2">
                  <input
                    type="date"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                    value={visitDate}
                    onChange={(e) => setVisitDate(e.target.value)}
                  />
                  <textarea
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                    rows={3}
                    placeholder="심방 내용을 입력하세요"
                    value={visitContent}
                    onChange={(e) => setVisitContent(e.target.value)}
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-sm"
                      onClick={() => { setShowVisitForm(false); setVisitDate(""); setVisitContent(""); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 text-sm"
                      disabled={!visitDate || !visitContent.trim()}
                      onClick={() => {
                        if (visitDate && visitContent.trim()) {
                          addPastoralVisit(id, visitDate, visitContent.trim());
                          setVisitDate("");
                          setVisitContent("");
                          setShowVisitForm(false);
                        }
                      }}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              )}
              {member.pastoralVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 심방 기록이 없습니다.</p>
              ) : (() => {
                const sortedVisits = [...member.pastoralVisits].sort((a, b) =>
                  b.visitedAt.localeCompare(a.visitedAt)
                );
                const totalVisits = sortedVisits.length;

                const renderVisitItem = (visit: (typeof sortedVisits)[number]) => (
                  <div key={visit.id} className="flex items-start gap-3 group">
                    <div className="flex-1 min-w-0">
                      {editingVisitId === visit.id ? (
                        <div className="space-y-1.5">
                          <input
                            type="date"
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            value={editingVisitDate}
                            onChange={(e) => setEditingVisitDate(e.target.value)}
                          />
                          <textarea
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                            rows={3}
                            value={editingVisitText}
                            onChange={(e) => setEditingVisitText(e.target.value)}
                          />
                          <div className="flex gap-1.5">
                            <Button size="sm" className="h-7 px-2 text-xs" disabled={!editingVisitDate || !editingVisitText.trim()}
                              onClick={() => { updatePastoralVisit(id, visit.id, editingVisitDate, editingVisitText.trim()); setEditingVisitId(null); }}>
                              <Check weight="bold" className="h-3 w-3 mr-1" />저장
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 px-2 text-xs"
                              onClick={() => setEditingVisitId(null)}>
                              <X weight="bold" className="h-3 w-3 mr-1" />취소
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-xs text-muted-foreground mb-0.5">{formatDate(visit.visitedAt)}</p>
                          <p className="text-sm whitespace-pre-wrap">{visit.content}</p>
                        </>
                      )}
                    </div>
                    {editingVisitId !== visit.id && (
                      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                          onClick={() => { setEditingVisitId(visit.id); setEditingVisitDate(visit.visitedAt); setEditingVisitText(visit.content); }}>
                          <PencilSimple weight="light" className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                          onClick={() => deletePastoralVisit(id, visit.id)}>
                          <Trash weight="light" className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );

                if (!showAllVisits) {
                  const latest = sortedVisits[0]!;
                  return (
                    <div className="space-y-3">
                      {renderVisitItem(latest)}
                      {totalVisits > 1 && (
                        <button
                          type="button"
                          onClick={() => setShowAllVisits(true)}
                          className="flex items-center gap-1 text-xs text-primary hover:text-primary/70 transition-colors pt-1"
                        >
                          <CaretDown weight="bold" className="h-3 w-3" />
                          전체 {totalVisits}건 보기
                        </button>
                      )}
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {sortedVisits.map((visit) => renderVisitItem(visit))}
                    <button
                      type="button"
                      onClick={() => setShowAllVisits(false)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                    >
                      <CaretUp weight="bold" className="h-3 w-3" />
                      접기
                    </button>
                  </div>
                );
              })()}
            </CardContent>
          </Card>
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
