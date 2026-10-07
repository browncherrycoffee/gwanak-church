"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cross, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MemberForm } from "@/components/members/member-form";
import { getMember, updateMember } from "@/lib/member-store";
import type { MemberFormData } from "@/types";

export default function EditMemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const member = getMember(id);

  if (!member) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="font-medium">교인 정보를 찾을 수 없습니다</p>
          <Button asChild className="mt-4">
            <Link href="/members">목록으로</Link>
          </Button>
        </div>
      </div>
    );
  }

  // 수정 권한 없는 사용자는 주소 직접 입력으로도 폼을 열 수 없음 (서버도 403으로 거부)
  if (member.canEdit === false) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="font-medium mb-2">이 교인을 수정할 권한이 없습니다</p>
          <p className="text-sm text-muted-foreground mb-4">
            본인이 등록한 교인만 수정할 수 있습니다. 변경이 필요하면 관리자에게 요청하세요.
          </p>
          <Button asChild variant="outline">
            <Link href={`/members/${id}`}>돌아가기</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (data: MemberFormData) => {
    updateMember(id, data);
    router.push(`/members/${id}`);
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="mx-auto flex h-16 max-w-4xl items-center gap-3 px-4">
          <Link href="/" className="shrink-0">
            <Cross weight="fill" className="h-7 w-7 text-primary" />
          </Link>
          <Button asChild variant="ghost" size="sm">
            <Link href={`/members/${id}`}>
              <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
              돌아가기
            </Link>
          </Button>
          <h1 className="text-lg font-bold">{member.name} 정보 수정</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <MemberForm
          initialData={member}
          onSubmit={handleSubmit}
          submitLabel="저장"
        />
      </main>
    </div>
  );
}
