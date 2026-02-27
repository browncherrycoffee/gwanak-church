"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FloppyDisk, ArrowLeft, Camera, Trash } from "@phosphor-icons/react";
import { POSITIONS, DEPARTMENTS, BAPTISM_TYPES, GENDERS, RELATIONSHIPS, MEMBER_STATUSES } from "@/lib/constants";
import { formatPhoneNumber, resizeImage } from "@/lib/utils";
import type { Member, MemberFormData } from "@/types";

interface MemberFormProps {
  initialData?: Member;
  onSubmit: (data: MemberFormData) => void;
  submitLabel: string;
}

export function MemberForm({ initialData, onSubmit, submitLabel }: MemberFormProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<MemberFormData>({
    name: initialData?.name ?? "",
    phone: initialData?.phone ?? "",
    address: initialData?.address ?? "",
    detailAddress: initialData?.detailAddress ?? "",
    birthDate: initialData?.birthDate ?? "",
    gender: initialData?.gender ?? "",
    position: initialData?.position ?? "성도",
    department: initialData?.department ?? "",
    district: initialData?.district ?? "",
    familyHead: initialData?.familyHead ?? "",
    relationship: initialData?.relationship ?? "",
    baptismDate: initialData?.baptismDate ?? "",
    baptismType: initialData?.baptismType ?? "",
    baptismChurch: initialData?.baptismChurch ?? "",
    registrationDate: initialData?.registrationDate ?? (initialData ? "" : new Date().toISOString().slice(0, 10)),
    memberJoinDate: initialData?.memberJoinDate ?? "",
    memberStatus: initialData?.memberStatus ?? "활동",
    notes: initialData?.notes ?? "",
    photoUrl: initialData?.photoUrl ?? "",
  });

  const handleChange = (field: keyof MemberFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await resizeImage(file, 400, 400, 0.8);
      setForm((prev) => ({ ...prev, photoUrl: dataUrl }));
    } catch {
      // ignore
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardContent className="p-6 space-y-6">
          {/* 기본 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">기본 정보</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="member-name" className="text-sm font-medium mb-1.5 block">
                  이름 <span className="text-destructive">*</span>
                </label>
                <Input
                  id="member-name"
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="이름"
                  required
                />
              </div>
              <div>
                <label htmlFor="member-phone" className="text-sm font-medium mb-1.5 block">연락처</label>
                <Input
                  id="member-phone"
                  value={form.phone}
                  onChange={(e) => handleChange("phone", formatPhoneNumber(e.target.value))}
                  placeholder="010-0000-0000"
                  maxLength={13}
                />
              </div>
              <div>
                <label htmlFor="member-gender" className="text-sm font-medium mb-1.5 block">성별</label>
                <select
                  id="member-gender"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.gender}
                  onChange={(e) => handleChange("gender", e.target.value)}
                >
                  <option value="">선택</option>
                  {GENDERS.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="member-birthDate" className="text-sm font-medium mb-1.5 block">생년월일</label>
                <Input
                  id="member-birthDate"
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="member-address" className="text-sm font-medium mb-1.5 block">주소</label>
                <Input
                  id="member-address"
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="주소"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label htmlFor="member-detailAddress" className="text-sm font-medium mb-1.5 block">상세 주소</label>
                <Input
                  id="member-detailAddress"
                  value={form.detailAddress}
                  onChange={(e) => handleChange("detailAddress", e.target.value)}
                  placeholder="동/호수"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-3">
                <label htmlFor="member-photo" className="text-sm font-medium mb-1.5 block">프로필 사진</label>
                <div className="flex items-center gap-4">
                  {form.photoUrl ? (
                    <div className="relative h-20 w-20 shrink-0 rounded-full overflow-hidden bg-secondary">
                      {/* biome-ignore lint/performance/noImgElement: data URL from resizeImage cannot use next/image */}
                      <img
                        src={form.photoUrl}
                        alt="프로필 미리보기"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                      <Camera weight="light" className="h-8 w-8" />
                    </div>
                  )}
                  <div className="flex flex-col gap-2">
                    <input
                      id="member-photo"
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Camera weight="light" className="mr-1.5 h-4 w-4" />
                      사진 선택
                    </Button>
                    {form.photoUrl && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setForm((prev) => ({ ...prev, photoUrl: "" }))}
                      >
                        <Trash weight="light" className="mr-1.5 h-4 w-4" />
                        사진 삭제
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* 교회 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">교회 정보</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="member-position" className="text-sm font-medium mb-1.5 block">직분</label>
                <select
                  id="member-position"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.position}
                  onChange={(e) => handleChange("position", e.target.value)}
                >
                  <option value="">선택</option>
                  {POSITIONS.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="member-department" className="text-sm font-medium mb-1.5 block">소속</label>
                <select
                  id="member-department"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.department}
                  onChange={(e) => handleChange("department", e.target.value)}
                >
                  <option value="">선택</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="member-district" className="text-sm font-medium mb-1.5 block">구역</label>
                <Input
                  id="member-district"
                  value={form.district}
                  onChange={(e) => handleChange("district", e.target.value)}
                  placeholder="예: 1구역"
                />
              </div>
              <div>
                <label htmlFor="member-registrationDate" className="text-sm font-medium mb-1.5 block">등록일</label>
                <Input
                  id="member-registrationDate"
                  type="date"
                  value={form.registrationDate}
                  onChange={(e) => handleChange("registrationDate", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="member-memberStatus" className="text-sm font-medium mb-1.5 block">상태</label>
                <select
                  id="member-memberStatus"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.memberStatus}
                  onChange={(e) => handleChange("memberStatus", e.target.value)}
                >
                  {MEMBER_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Separator />

          {/* 가족 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">가족 정보</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="member-familyHead" className="text-sm font-medium mb-1.5 block">세대주</label>
                <Input
                  id="member-familyHead"
                  value={form.familyHead}
                  onChange={(e) => handleChange("familyHead", e.target.value)}
                  placeholder="세대주 이름"
                />
              </div>
              <div>
                <label htmlFor="member-relationship" className="text-sm font-medium mb-1.5 block">관계</label>
                <select
                  id="member-relationship"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.relationship}
                  onChange={(e) => handleChange("relationship", e.target.value)}
                >
                  <option value="">선택</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <Separator />

          {/* 세례 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">세례 정보</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label htmlFor="member-baptismType" className="text-sm font-medium mb-1.5 block">세례 종류</label>
                <select
                  id="member-baptismType"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={form.baptismType}
                  onChange={(e) => handleChange("baptismType", e.target.value)}
                >
                  <option value="">선택</option>
                  {BAPTISM_TYPES.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="member-baptismDate" className="text-sm font-medium mb-1.5 block">세례일</label>
                <Input
                  id="member-baptismDate"
                  type="date"
                  value={form.baptismDate}
                  onChange={(e) => handleChange("baptismDate", e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="member-baptismChurch" className="text-sm font-medium mb-1.5 block">세례받은 교회</label>
                <Input
                  id="member-baptismChurch"
                  value={form.baptismChurch}
                  onChange={(e) => handleChange("baptismChurch", e.target.value)}
                  placeholder="세례받은 교회"
                />
              </div>
              <div>
                <label htmlFor="member-memberJoinDate" className="text-sm font-medium mb-1.5 block">세례교인회원가입일</label>
                <Input
                  id="member-memberJoinDate"
                  type="date"
                  value={form.memberJoinDate}
                  onChange={(e) => handleChange("memberJoinDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 비고 */}
          <div>
            <label htmlFor="member-notes" className="text-sm font-medium mb-1.5 block">비고</label>
            <textarea
              id="member-notes"
              className="flex min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              value={form.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="기타 메모"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* 버튼 */}
      <div className="mt-6 flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
        >
          <ArrowLeft weight="light" className="mr-2 h-4 w-4" />
          취소
        </Button>
        <Button type="submit">
          <FloppyDisk weight="light" className="mr-2 h-4 w-4" />
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
