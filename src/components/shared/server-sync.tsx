"use client";

import { useEffect, useState } from "react";
import {
  initFromServer,
  autoApplyPrayerImport,
  syncNow,
  subscribeSyncStatus,
  subscribeServerUpdate,
  pollForChanges,
} from "@/lib/member-store";
import { CloudArrowUp, Check, ArrowsClockwise } from "@phosphor-icons/react";

export function ServerSync() {
  const [pending, setPending] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [remoteUpdated, setRemoteUpdated] = useState(false);

  useEffect(() => {
    // 첫 로드 시 서버 데이터 초기화
    initFromServer().then(() => autoApplyPrayerImport());

    // 탭/창 닫을 때 keepalive로 강제 동기화
    const handleUnload = () => syncNow();
    window.addEventListener("beforeunload", handleUnload);

    // 탭/앱이 다시 활성화될 때 즉시 갱신 (PC 탭 전환, 모바일 앱 전환)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") initFromServer();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 3초마다 버전 체크 → 변경 있을 때만 전체 데이터 로드
    const poll = setInterval(() => pollForChanges(), 3_000);

    // 로컬 저장 상태 구독
    const unsubSync = subscribeSyncStatus((p) => {
      setPending(p);
      if (!p) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
    });

    // 다른 기기에서 업데이트된 경우 알림
    const unsubRemote = subscribeServerUpdate(() => {
      setRemoteUpdated(true);
      setTimeout(() => setRemoteUpdated(false), 3000);
    });

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(poll);
      unsubSync();
      unsubRemote();
    };
  }, []);

  if (!pending && !justSynced && !remoteUpdated) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs shadow-sm text-muted-foreground">
      {pending ? (
        <>
          <CloudArrowUp weight="light" className="h-3.5 w-3.5 animate-pulse text-primary" />
          저장 중…
        </>
      ) : remoteUpdated ? (
        <>
          <ArrowsClockwise weight="bold" className="h-3.5 w-3.5 text-blue-500" />
          <span className="text-blue-600">다른 기기에서 업데이트됨</span>
        </>
      ) : (
        <>
          <Check weight="bold" className="h-3.5 w-3.5 text-primary" />
          저장됨
        </>
      )}
    </div>
  );
}
