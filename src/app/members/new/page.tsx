"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Cross, ArrowLeft } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { MemberForm } from "@/components/members/member-form";
import { addMember } from "@/lib/member-store";
import type { MemberFormData } from "@/types";

export default function NewMemberPage() {
  const router = useRouter();

  const handleSubmit = (data: MemberFormData) => {
    addMember(data);
    router.push("/members");
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
          <h1 className="text-lg font-bold">새 교인 등록</h1>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6">
        <MemberForm onSubmit={handleSubmit} submitLabel="등록" />
      </main>
    </div>
  );
}
