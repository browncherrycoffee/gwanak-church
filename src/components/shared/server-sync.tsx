"use client";

import { useEffect, useState } from "react";
import {
  initFromServer,
  autoApplyPrayerImport,
  syncNow,
  subscribeSyncStatus,
  subscribeServerUpdate,
  subscribeSyncError,
  pollForChanges,
} from "@/lib/member-store";
import { CloudArrowUp, Check, ArrowsClockwise, WarningCircle } from "@phosphor-icons/react";

export function ServerSync() {
  const [pending, setPending] = useState(false);
  const [justSynced, setJustSynced] = useState(false);
  const [remoteUpdated, setRemoteUpdated] = useState(false);
  const [syncError, setSyncError] = useState(false);

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

    // 2초마다 버전 체크 → 변경 있을 때만 전체 데이터 로드
    const poll = setInterval(() => pollForChanges(), 2_000);

    // 로컬 저장 상태 구독
    const unsubSync = subscribeSyncStatus((p) => {
      setPending(p);
      if (!p) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
    });

    // 저장 오류 (로그인 필요 등)
    const unsubError = subscribeSyncError((err) => {
      setSyncError(err);
      if (err) setTimeout(() => setSyncError(false), 6000);
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
      unsubError();
      unsubRemote();
    };
  }, []);

  if (!pending && !justSynced && !remoteUpdated && !syncError) return null;

  return (
    <div
      className={`fixed bottom-6 right-4 z-50 flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium shadow-lg transition-all ${
        syncError
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : pending
          ? "border-primary/20 bg-background text-muted-foreground"
          : remoteUpdated
          ? "border-blue-300 bg-blue-50 text-blue-700"
          : "border-green-300 bg-green-50 text-green-700"
      }`}
    >
      {syncError ? (
        <>
          <WarningCircle weight="bold" className="h-4 w-4" />
          <span>저장 실패 — 다시 로그인 필요</span>
        </>
      ) : pending ? (
        <>
          <CloudArrowUp weight="light" className="h-4 w-4 animate-pulse text-primary" />
          <span>저장 중…</span>
        </>
      ) : remoteUpdated ? (
        <>
          <ArrowsClockwise weight="bold" className="h-4 w-4" />
          <span>다른 기기에서 수정됨 — 최신화됨</span>
        </>
      ) : (
        <>
          <Check weight="bold" className="h-4 w-4" />
          <span>저장 및 동기화 완료</span>
        </>
      )}
    </div>
  );
}
