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
  const [syncError, setSyncError] = useState<string | false>(false);

  useEffect(() => {
    initFromServer().then(() => autoApplyPrayerImport());

    // pagehide: iOS Safari에서도 안정적으로 발생 (beforeunload는 불안정)
    const handleUnload = () => syncNow();
    window.addEventListener("pagehide", handleUnload);
    window.addEventListener("beforeunload", handleUnload);

    // 탭 활성화 시 최신 데이터 로드
    const handleVisibility = () => {
      if (document.visibilityState === "visible") initFromServer();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 2초마다 버전 폴링
    const poll = setInterval(() => pollForChanges(), 2_000);

    // 동기화 상태
    let pendingTimeout: ReturnType<typeof setTimeout> | null = null;
    const unsubSync = subscribeSyncStatus((p) => {
      setPending(p);
      if (pendingTimeout) { clearTimeout(pendingTimeout); pendingTimeout = null; }
      if (p) {
        pendingTimeout = setTimeout(() => setPending(false), 30_000);
      } else {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 3000);
      }
    });

    const unsubError = subscribeSyncError((err) => {
      setSyncError(err);
      if (err) setTimeout(() => setSyncError(false), 10000);
    });

    const unsubRemote = subscribeServerUpdate(() => {
      setRemoteUpdated(true);
      setTimeout(() => setRemoteUpdated(false), 3000);
    });

    return () => {
      window.removeEventListener("pagehide", handleUnload);
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(poll);
      if (pendingTimeout) clearTimeout(pendingTimeout);
      unsubSync();
      unsubError();
      unsubRemote();
    };
  }, []);

  if (!pending && !justSynced && !remoteUpdated && !syncError) return null;

  const errorMessage = syncError === "auth"
    ? "저장 실패 — 다시 로그인 필요"
    : syncError
    ? `저장 실패 [${syncError}]`
    : null;

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
          <span>{errorMessage}</span>
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
