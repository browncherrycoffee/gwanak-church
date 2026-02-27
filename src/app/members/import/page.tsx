"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import {
  Cross,
  ArrowLeft,
  UploadSimple,
  FileText,
  Check,
  Warning,
} from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { addMember } from "@/lib/member-store";
import { parseCsvImport } from "@/lib/import";
import type { MemberFormData } from "@/types";

export default function ImportMembersPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<MemberFormData[] | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const result = parseCsvImport(text);
      setPreview(result.members);
      setErrors(result.errors);
      setImported(false);
    };
    reader.readAsText(file, "utf-8");
  };

  const handleImport = () => {
    if (!preview) return;
    for (const member of preview) {
      addMember(member);
    }
    setImported(true);
  };

  return (
    <div className="min-h-screen">
      <header className="border-b bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href="/members">
              <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
              목록
            </Link>
          </Button>
          <h1 className="text-lg font-bold">교적 일괄 가져오기</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 space-y-6">
        {/* 안내 */}
        <Card>
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground mb-3">CSV 파일 형식</h2>
            <p className="text-sm text-muted-foreground mb-3">
              아래 열 이름을 포함한 CSV 파일을 업로드하세요. <strong>이름</strong> 열은 필수입니다.
            </p>
            <div className="flex flex-wrap gap-1.5">
              {["이름", "연락처", "주소", "상세주소", "생년월일", "성별", "직분", "소속", "구역", "세대주", "관계", "세례종류", "세례일", "등록일", "비고"].map((col) => (
                <Badge key={col} variant={col === "이름" ? "default" : "secondary"} className="text-xs">
                  {col}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 파일 업로드 */}
        <Card>
          <CardContent className="p-5">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center gap-3 rounded-lg border-2 border-dashed border-border p-8 hover:border-primary hover:bg-secondary/50 transition-colors cursor-pointer"
            >
              <UploadSimple weight="light" className="h-10 w-10 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium">CSV 파일을 선택하세요</p>
                <p className="text-xs text-muted-foreground mt-1">
                  또는 여기에 파일을 드래그하세요
                </p>
              </div>
            </button>
          </CardContent>
        </Card>

        {/* 에러 */}
        {errors.length > 0 && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <Warning weight="light" className="h-4 w-4 text-destructive" />
                <h2 className="text-sm font-semibold text-destructive">
                  주의사항 ({errors.length}건)
                </h2>
              </div>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {errors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* 미리보기 */}
        {preview && preview.length > 0 && !imported && (
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <FileText weight="light" className="h-4 w-4 text-primary" />
                  <h2 className="text-sm font-semibold">
                    가져올 교인: {preview.length}명
                  </h2>
                </div>
                <Button onClick={handleImport} size="sm">
                  <UploadSimple weight="light" className="mr-1.5 h-4 w-4" />
                  가져오기
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-xs text-muted-foreground">
                      <th className="py-2 pr-4 text-left font-medium">이름</th>
                      <th className="py-2 pr-4 text-left font-medium">연락처</th>
                      <th className="py-2 pr-4 text-left font-medium">직분</th>
                      <th className="py-2 pr-4 text-left font-medium">소속</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((m, i) => (
                      <tr key={`${m.name}-${i}`} className="border-b last:border-0">
                        <td className="py-2 pr-4 font-medium">{m.name}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{m.phone || "-"}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{m.position || "-"}</td>
                        <td className="py-2 pr-4 text-muted-foreground">{m.department || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {preview.length > 20 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    ... 외 {preview.length - 20}명 더
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 가져오기 완료 */}
        {imported && (
          <Card>
            <CardContent className="p-5">
              <div className="flex flex-col items-center gap-3 py-4">
                <Check weight="light" className="h-10 w-10 text-primary" />
                <p className="font-medium">{preview?.length}명의 교적을 가져왔습니다</p>
                <Button asChild>
                  <Link href="/members">전체 목록 보기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
