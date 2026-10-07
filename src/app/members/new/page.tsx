"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cross, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MemberForm } from "@/components/members/member-form";
import { addMember, getAuthInfo, loadAuthInfo, subscribeAuth, canAddMemberClient } from "@/lib/member-store";
import { useEffect, useSyncExternalStore } from "react";
import type { MemberFormData } from "@/types";

export default function NewMemberPage() {
  const router = useRouter();
  const auth = useSyncExternalStore(subscribeAuth, getAuthInfo, () => null);
  useEffect(() => { loadAuthInfo(); }, []);

  const handleSubmit = (data: MemberFormData) => {
    const newMember = addMember(data);
    router.push(`/members/${newMember.id}`);
  };

  // 등록 권한(관리자·목사·장로·집사) 없는 사용자는 폼 자체를 열 수 없음
  if (auth && !canAddMemberClient()) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="font-medium mb-2">교인 등록 권한이 없습니다</p>
          <p className="text-sm text-muted-foreground mb-4">
            교인 등록은 관리자·목사님·장로님·집사님만 할 수 있습니다.
          </p>
          <Button asChild variant="outline">
            <Link href="/members">목록으로</Link>
          </Button>
        </div>
      </div>
    );
  }

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
          <h1 className="text-lg font-bold">새 교인 등록</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <MemberForm onSubmit={handleSubmit} submitLabel="등록" />
      </main>
    </div>
  );
}
