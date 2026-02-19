"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { FloppyDisk, ArrowLeft } from "@phosphor-icons/react";
import { POSITIONS, DEPARTMENTS, BAPTISM_TYPES, GENDERS, RELATIONSHIPS } from "@/lib/constants";
import type { Member, MemberFormData } from "@/types";

interface MemberFormProps {
  initialData?: Member;
  onSubmit: (data: MemberFormData) => void;
  submitLabel: string;
}

export function MemberForm({ initialData, onSubmit, submitLabel }: MemberFormProps) {
  const router = useRouter();
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
    registrationDate: initialData?.registrationDate ?? "",
    notes: initialData?.notes ?? "",
  });

  const handleChange = (field: keyof MemberFormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
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
                <label className="text-sm font-medium mb-1.5 block">
                  이름 <span className="text-destructive">*</span>
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  placeholder="이름"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">연락처</label>
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="010-0000-0000"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">성별</label>
                <select
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
                <label className="text-sm font-medium mb-1.5 block">생년월일</label>
                <Input
                  type="date"
                  value={form.birthDate}
                  onChange={(e) => handleChange("birthDate", e.target.value)}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium mb-1.5 block">주소</label>
                <Input
                  value={form.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  placeholder="주소"
                />
              </div>
              <div className="sm:col-span-2 lg:col-span-1">
                <label className="text-sm font-medium mb-1.5 block">상세 주소</label>
                <Input
                  value={form.detailAddress}
                  onChange={(e) => handleChange("detailAddress", e.target.value)}
                  placeholder="동/호수"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 교회 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">교회 정보</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">직분</label>
                <select
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
                <label className="text-sm font-medium mb-1.5 block">소속</label>
                <select
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
                <label className="text-sm font-medium mb-1.5 block">구역</label>
                <Input
                  value={form.district}
                  onChange={(e) => handleChange("district", e.target.value)}
                  placeholder="예: 1구역"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">등록일</label>
                <Input
                  type="date"
                  value={form.registrationDate}
                  onChange={(e) => handleChange("registrationDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 가족 정보 */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-4">가족 정보</h3>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-sm font-medium mb-1.5 block">세대주</label>
                <Input
                  value={form.familyHead}
                  onChange={(e) => handleChange("familyHead", e.target.value)}
                  placeholder="세대주 이름"
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1.5 block">관계</label>
                <select
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
                <label className="text-sm font-medium mb-1.5 block">세례 종류</label>
                <select
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
                <label className="text-sm font-medium mb-1.5 block">세례일</label>
                <Input
                  type="date"
                  value={form.baptismDate}
                  onChange={(e) => handleChange("baptismDate", e.target.value)}
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* 비고 */}
          <div>
            <label className="text-sm font-medium mb-1.5 block">비고</label>
            <textarea
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
