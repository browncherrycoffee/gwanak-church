"use client";

import { use, useState, useSyncExternalStore, useEffect, useCallback } from "react";
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
  LockSimple,
  Car,
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
  getAuthInfo,
  loadAuthInfo,
  subscribeAuth,
  getScope,
} from "@/lib/member-store";
import {
  subscribePrayers,
  getPrayers,
  getPrayersByMember,
  loadPrayers,
  addPrayer,
  updatePrayer,
  deletePrayer,
} from "@/lib/prayer-store";
import { formatDate } from "@/lib/utils";

// GET /api/pastoral 응답 형태 (서버가 권한 필터를 끝낸 결과)
interface PastoralNote {
  id: string;
  content: string;
  authorName: string;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
}
interface PastoralRecord {
  id: string;
  memberId: string;
  visitedAt: string | null;
  sharedContent: string | null;
  authorName: string;
  createdAt: string;
  canEdit: boolean;
  canDelete: boolean;
  privateNotes: PastoralNote[];
}

const PASTORAL_GRADES = ["목사", "장로", "집사"];

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
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [editingPrayerId, setEditingPrayerId] = useState<string | null>(null);
  const [editingPrayerText, setEditingPrayerText] = useState("");
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitShared, setVisitShared] = useState("");
  const [visitPrivate, setVisitPrivate] = useState("");
  const [visitError, setVisitError] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [editingVisitDate, setEditingVisitDate] = useState("");
  const [editingVisitText, setEditingVisitText] = useState("");
  const [showAllPrayers, setShowAllPrayers] = useState(false);
  const [showAllVisits, setShowAllVisits] = useState(false);
  const [pastoralRecords, setPastoralRecords] = useState<PastoralRecord[]>([]);
  const [pastoralDenied, setPastoralDenied] = useState(false);

  // 권한 정보 — 실제 권한 판단은 서버가 하고, 여기서는 화면 구성에만 사용
  const auth = useSyncExternalStore(subscribeAuth, getAuthInfo, () => null);
  const scope = useSyncExternalStore(subscribeAuth, getScope, getScope);
  const isAdmin = auth?.isAdmin === true;
  const roleGrade = auth?.roleGrade ?? "없음";
  const canPastoral =
    isAdmin || (auth?.pastoralAccess ?? PASTORAL_GRADES.includes(roleGrade));
  const nameOnly = scope === "name-only";

  useEffect(() => {
    loadAuthInfo();
    loadPrayers();
  }, []);

  const loadPastoral = useCallback(async () => {
    try {
      const res = await fetch("/api/pastoral", { cache: "no-store" });
      if (res.status === 403) {
        setPastoralDenied(true);
        return;
      }
      if (!res.ok) return;
      const data = (await res.json()) as { records?: PastoralRecord[] };
      if (Array.isArray(data.records)) setPastoralRecords(data.records);
    } catch {
      // 네트워크 오류 — 기존 상태 유지
    }
  }, []);

  useEffect(() => {
    if (canPastoral) loadPastoral();
  }, [canPastoral, loadPastoral]);

  // subscribe to store changes
  useSyncExternalStore(subscribe, getMembers, getMembers);
  useSyncExternalStore(subscribePrayers, getPrayers, getPrayers);
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

  // ─── 기도제목 (prayer-store, 서버 권한 검증) ────────────────────────────
  const memberPrayers = getPrayersByMember(member.id);
  // 추가 버튼: 서버 규칙(canAddPrayer)과 동일 — 관리자·목사, 또는 이 성도의 조장·부서장만
  const canAddPrayerHere =
    isAdmin ||
    roleGrade === "목사" ||
    auth?.prayerScope === "all" ||
    (auth?.assignments ?? []).some(
      (a) =>
        (a.unitType === "nanumjo" && !!member.nanumjo && a.unitName === member.nanumjo) ||
        (a.unitType === "department" && (member.departments ?? []).includes(a.unitName)),
    );
  const showPrayerCard = !nameOnly && (canAddPrayerHere || memberPrayers.length > 0);

  const handleAddPrayer = async () => {
    if (!prayerInput.trim()) return;
    const result = await addPrayer(member.id, prayerInput.trim());
    if (!result.ok) {
      setPrayerError(result.error ?? "저장에 실패했습니다.");
      return;
    }
    setPrayerError(null);
    setPrayerInput("");
    setShowPrayerForm(false);
  };

  const handleUpdatePrayer = async (prayerId: string) => {
    if (!editingPrayerText.trim()) return;
    const result = await updatePrayer(prayerId, editingPrayerText.trim());
    if (!result.ok) {
      setPrayerError(result.error ?? "수정에 실패했습니다.");
      return;
    }
    setPrayerError(null);
    setEditingPrayerId(null);
  };

  const handleDeletePrayer = async (prayerId: string) => {
    const result = await deletePrayer(prayerId);
    if (!result.ok) setPrayerError(result.error ?? "삭제에 실패했습니다.");
    else setPrayerError(null);
  };

  // ─── 심방 기록 (/api/pastoral) ──────────────────────────────────────────
  const memberVisits = pastoralRecords.filter((r) => r.memberId === member.id);

  const handleAddVisit = async () => {
    if (!visitShared.trim() && !visitPrivate.trim()) {
      setVisitError("공유 심방기록 또는 비공개 메모 중 하나는 입력해야 합니다.");
      return;
    }
    try {
      const res = await fetch("/api/pastoral", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          visitedAt: visitDate || null,
          sharedContent: visitShared.trim() || undefined,
          privateNote: visitPrivate.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setVisitError(data.error ?? `저장 실패 (${res.status})`);
        return;
      }
      setVisitError(null);
      setVisitDate("");
      setVisitShared("");
      setVisitPrivate("");
      setShowVisitForm(false);
      loadPastoral();
    } catch {
      setVisitError("네트워크 오류");
    }
  };

  const handleUpdateVisit = async (recordId: string) => {
    if (!editingVisitText.trim()) return;
    try {
      const res = await fetch(`/api/pastoral/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sharedContent: editingVisitText.trim(),
          visitedAt: editingVisitDate || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setVisitError(data.error ?? `수정 실패 (${res.status})`);
        return;
      }
      setVisitError(null);
      setEditingVisitId(null);
      loadPastoral();
    } catch {
      setVisitError("네트워크 오류");
    }
  };

  const handleDeleteVisit = async (recordId: string) => {
    try {
      let res = await fetch(`/api/pastoral/${recordId}`, { method: "DELETE" });
      if (res.status === 409) {
        const data = (await res.json().catch(() => ({}))) as {
          noteCount?: number;
          message?: string;
        };
        const message =
          data.message ?? `비공개 메모 ${data.noteCount ?? 0}건이 함께 삭제됩니다.`;
        if (!window.confirm(`${message} 계속하시겠습니까?`)) return;
        res = await fetch(`/api/pastoral/${recordId}?confirm=1`, { method: "DELETE" });
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setVisitError(data.error ?? `삭제 실패 (${res.status})`);
        return;
      }
      setVisitError(null);
      loadPastoral();
    } catch {
      setVisitError("네트워크 오류");
    }
  };

  const fullAddress = [member.address, member.detailAddress].filter(Boolean).join(" ");
  const infoRows = [
    { icon: Phone, label: "연락처", value: member.phone, linkType: "phone" as const },
    { icon: MapPin, label: "주소", value: fullAddress || null, linkType: "address" as const },
    { icon: CalendarBlank, label: "생년월일", value: member.birthDate ? formatDate(member.birthDate) : null, linkType: "none" as const },
    { icon: User, label: "성별", value: member.gender, linkType: "none" as const },
    { icon: Car, label: "차량 번호", value: member.carNumber ?? null, linkType: "none" as const },
  ];

  const churchRows = [
    { icon: Tag, label: "직분", value: member.position },
    { icon: UsersThree, label: "소속", value: [member.department, member.district].filter(Boolean).join(" / ") },
    { icon: UsersThree, label: "나눔조", value: member.nanumjo ?? null },
    { icon: CalendarBlank, label: "등록일", value: member.registrationDate ? formatDate(member.registrationDate) : null },
    { icon: CalendarBlank, label: "세례교인회원가입일", value: member.memberJoinDate ? formatDate(member.memberJoinDate) : null },
    { icon: UsersThree, label: "공동의회회원", value: member.congregationMember ? "예" : "아니오" },
  ];

  const baptismRows = [
    { icon: Cross, label: "세례 종류", value: member.baptismType },
    { icon: CalendarBlank, label: "세례일", value: member.baptismDate ? formatDate(member.baptismDate) : null },
    { icon: Cross, label: "세례받은 교회", value: member.baptismChurch },
  ];

  // 이름·소속만 보기 — 서버가 민감 정보를 보내지 않았으므로 축소 화면만 렌더링
  const nameOnlyRows = [
    { icon: UsersThree, label: "나눔조", value: member.nanumjo ?? null },
    { icon: UsersThree, label: "부서", value: (member.departments ?? []).join(", ") || null },
    { icon: Phone, label: "연락처", value: member.phone },
    { icon: MapPin, label: "주소", value: [member.address, member.detailAddress].filter(Boolean).join(" ") || null },
    { icon: Cross, label: "세례", value: [member.baptismType, member.baptismDate ? formatDate(member.baptismDate) : null, member.baptismChurch].filter(Boolean).join(" · ") || null },
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
            {scope === "full" && (
              <Button asChild variant="outline" size="sm" className="h-9 px-3">
                <Link href={`/members/${id}/edit`}>
                  <PencilSimple weight="light" className="h-4 w-4 sm:mr-1.5" />
                  <span className="hidden sm:inline">수정</span>
                </Link>
              </Button>
            )}
            {isAdmin && (
              <Button variant="outline" size="sm" onClick={() => setShowDeleteDialog(true)} className="h-9 px-3 text-destructive hover:text-destructive">
                <Trash weight="light" className="h-4 w-4 sm:mr-1.5" />
                <span className="hidden sm:inline">삭제</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        {/* 프로필 헤더 */}
        <div className="mb-6 flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-secondary text-primary overflow-hidden">
              {!nameOnly && member.photoUrl ? (
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
          {member.memberStatus !== "제적" && isAdmin && (
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

        {nameOnly ? (
          /* 이름·소속만 보기 — 연락처·주소·생년월일·사진·세례·가족·기도제목·심방 비표시 */
          <Card>
            <CardContent className="p-5">
              <h2 className="text-sm font-semibold text-muted-foreground mb-4">소속 정보</h2>
              <div className="space-y-3">
                {nameOnlyRows.map((row) => row.value && (
                  <div key={row.label} className="flex items-start gap-3">
                    <row.icon weight="light" className="mt-0.5 h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="text-xs text-muted-foreground">{row.label}</p>
                      <p className="text-sm">{row.value}</p>
                    </div>
                  </div>
                ))}
                {!nameOnlyRows.some((row) => row.value) && (
                  <p className="text-sm text-muted-foreground">소속 정보가 없습니다.</p>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
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

          {/* 세례 정보 */}
          {(member.baptismType || member.baptismDate || member.baptismChurch) && (
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

          {/* 가족 정보 */}
          {member.familyMembers && member.familyMembers.length > 0 && (() => {
            const allMembers = getMembers();
            const nameToMember = new Map(allMembers.map((m) => [m.name, m]));
            return (
              <Card>
                <CardContent className="p-5">
                  <h2 className="text-sm font-semibold text-muted-foreground mb-4">가족 정보</h2>
                  <div className="space-y-2">
                    {member.familyMembers.map((name) => {
                      const fm = nameToMember.get(name);
                      return fm ? (
                        <Link
                          key={name}
                          href={`/members/${fm.id}`}
                          className="flex items-center gap-2 rounded-md px-2 py-2 -mx-2 hover:bg-secondary transition-colors"
                        >
                          <User weight="light" className="h-4 w-4 text-primary shrink-0" />
                          <span className="text-sm font-medium">{name}</span>
                          {fm.position && fm.position !== "성도" && (
                            <Badge variant="secondary" className="text-[10px] ml-auto">
                              {fm.position}
                            </Badge>
                          )}
                        </Link>
                      ) : (
                        <div key={name} className="flex items-center gap-2 px-2 py-2">
                          <User weight="light" className="h-4 w-4 text-muted-foreground shrink-0" />
                          <span className="text-sm text-muted-foreground">{name}</span>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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
          {showPrayerCard && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Heart weight="light" className="h-4 w-4" />
                  기도제목
                </h2>
                {canAddPrayerHere && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-3 text-sm"
                    onClick={() => { setShowPrayerForm((v) => !v); setPrayerInput(""); setPrayerError(null); }}
                  >
                    <Plus weight="bold" className="h-3.5 w-3.5 mr-1" />
                    추가
                  </Button>
                )}
              </div>
              {prayerError && (
                <p className="mb-3 text-xs text-destructive">{prayerError}</p>
              )}
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
                      onClick={() => { setShowPrayerForm(false); setPrayerInput(""); setPrayerError(null); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 text-sm"
                      disabled={!prayerInput.trim()}
                      onClick={handleAddPrayer}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              )}
              {memberPrayers.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 기도제목이 없습니다.</p>
              ) : (() => {
                const sorted = [...memberPrayers].sort((a, b) =>
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
                        <span className="ml-1.5 text-muted-foreground/70">{req.authorName}</span>
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
                              onClick={() => handleUpdatePrayer(req.id)}>
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
                    {editingPrayerId !== req.id && (req.canEdit || req.canDelete) && (
                      <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        {req.canEdit && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                            onClick={() => { setEditingPrayerId(req.id); setEditingPrayerText(req.content); }}>
                            <PencilSimple weight="light" className="h-3.5 w-3.5" />
                          </Button>
                        )}
                        {req.canDelete && (
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeletePrayer(req.id)}>
                            <Trash weight="light" className="h-3.5 w-3.5" />
                          </Button>
                        )}
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
          )}

          {/* 심방 기록 — 목사·장로·집사·관리자에게만 카드 자체를 렌더링 (존재 여부도 비노출) */}
          {canPastoral && !pastoralDenied && (
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
                  onClick={() => { setShowVisitForm((v) => !v); setVisitDate(""); setVisitShared(""); setVisitPrivate(""); setVisitError(null); }}
                >
                  <Plus weight="bold" className="h-3.5 w-3.5 mr-1" />
                  추가
                </Button>
              </div>
              {visitError && (
                <p className="mb-3 text-xs text-destructive">{visitError}</p>
              )}
              {showVisitForm && (
                <div className="mb-4 space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">심방일</p>
                    <input
                      type="date"
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">공유 심방기록</p>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={3}
                      placeholder="공유할 심방 내용을 입력하세요"
                      value={visitShared}
                      onChange={(e) => setVisitShared(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">관리자·목사님·장로님·집사님이 열람할 수 있습니다.</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">비공개 심방메모 (선택)</p>
                    <textarea
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-1 focus:ring-ring"
                      rows={3}
                      placeholder="비공개로 남길 메모가 있으면 입력하세요"
                      value={visitPrivate}
                      onChange={(e) => setVisitPrivate(e.target.value)}
                    />
                    <p className="text-[11px] text-muted-foreground mt-0.5">작성자 본인·담임목사님·관리자만 열람할 수 있습니다.</p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-9 text-sm"
                      onClick={() => { setShowVisitForm(false); setVisitDate(""); setVisitShared(""); setVisitPrivate(""); setVisitError(null); }}
                    >
                      취소
                    </Button>
                    <Button
                      size="sm"
                      className="h-9 text-sm"
                      disabled={!visitShared.trim() && !visitPrivate.trim()}
                      onClick={handleAddVisit}
                    >
                      저장
                    </Button>
                  </div>
                </div>
              )}
              {memberVisits.length === 0 ? (
                <p className="text-sm text-muted-foreground">등록된 심방 기록이 없습니다.</p>
              ) : (() => {
                const sortedVisits = [...memberVisits].sort((a, b) =>
                  (b.visitedAt ?? b.createdAt).localeCompare(a.visitedAt ?? a.createdAt)
                );
                const totalVisits = sortedVisits.length;

                const renderVisitItem = (visit: (typeof sortedVisits)[number]) => (
                  <div key={visit.id} className="space-y-2">
                    <div className="flex items-start gap-3 group">
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
                              <Button size="sm" className="h-7 px-2 text-xs" disabled={!editingVisitText.trim()}
                                onClick={() => handleUpdateVisit(visit.id)}>
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
                            <p className="text-xs text-muted-foreground mb-0.5">
                              {visit.visitedAt ? formatDate(visit.visitedAt) : "날짜 미기재"}
                              <span className="ml-1.5 text-muted-foreground/70">{visit.authorName}</span>
                            </p>
                            {visit.sharedContent && (
                              <p className="text-sm whitespace-pre-wrap">{visit.sharedContent}</p>
                            )}
                          </>
                        )}
                      </div>
                      {editingVisitId !== visit.id && (visit.canEdit || visit.canDelete) && (
                        <div className="flex gap-0.5 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                          {visit.canEdit && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-primary"
                              onClick={() => { setEditingVisitId(visit.id); setEditingVisitDate(visit.visitedAt ?? ""); setEditingVisitText(visit.sharedContent ?? ""); }}>
                              <PencilSimple weight="light" className="h-3.5 w-3.5" />
                            </Button>
                          )}
                          {visit.canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                              onClick={() => handleDeleteVisit(visit.id)}>
                              <Trash weight="light" className="h-3.5 w-3.5" />
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                    {/* 비공개 메모 — 서버가 열람 권한을 필터링해서 내려준 것만 표시 */}
                    {visit.privateNotes.length > 0 && (
                      <div className="space-y-1.5 pl-3">
                        {visit.privateNotes.map((note) => (
                          <div key={note.id} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <LockSimple weight="fill" className="h-3 w-3 text-amber-600" />
                              <Badge variant="outline" className="text-[10px] px-1.5 border-amber-300 text-amber-700">비공개</Badge>
                              <span className="text-xs text-muted-foreground">{note.authorName}</span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap">{note.content}</p>
                          </div>
                        ))}
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
          )}
        </div>
        )}
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
