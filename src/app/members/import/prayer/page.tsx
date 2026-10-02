"use client";

import Link from "next/link";
import { ArrowLeft, Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";

// 구 기도제목 일괄 가져오기(localStorage/jsonb 기반)는 권한 체계 개편으로 중단.
// 기존 기도제목은 서버 이전 스크립트(scripts/migrate-prayers.mjs)로 일괄 이관한다.
export default function PrayerImportPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16 text-center">
      <Info weight="light" className="mx-auto mb-4 h-10 w-10 text-muted-foreground/50" />
      <h1 className="text-lg font-bold mb-2">기도제목 가져오기 기능 변경</h1>
      <p className="text-sm text-muted-foreground mb-6">
        기도제목이 권한 관리가 되는 새 저장 방식으로 바뀌어, 이 화면의 일괄 가져오기는
        중단되었습니다. 기존 기도제목은 전환 과정에서 자동으로 이관됩니다.
      </p>
      <Button asChild variant="outline">
        <Link href="/members">
          <ArrowLeft weight="light" className="mr-1.5 h-4 w-4" />
          교인 목록으로
        </Link>
      </Button>
    </div>
  );
}
