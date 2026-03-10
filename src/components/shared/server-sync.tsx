"use client";

import { useEffect, useState } from "react";
import { initFromServer, autoApplyPrayerImport, syncNow, subscribeSyncStatus } from "@/lib/member-store";
import { CloudArrowUp, Check } from "@phosphor-icons/react";

export function ServerSync() {
  const [pending, setPending] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  useEffect(() => {
    initFromServer().then(() => autoApplyPrayerImport());

    // 탭/창 닫을 때 keepalive로 강제 동기화
    const handleUnload = () => syncNow();
    window.addEventListener("beforeunload", handleUnload);

    // 탭/앱이 다시 활성화될 때 즉시 갱신 (PC 탭 전환, 모바일 앱 전환)
    const handleVisibility = () => {
      if (document.visibilityState === "visible") initFromServer();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // 10초마다 폴링 — 다기기 동시 사용 시 자동 최신화
    const poll = setInterval(() => initFromServer(), 10_000);

    // 동기화 상태 구독
    const unsub = subscribeSyncStatus((p) => {
      setPending(p);
      if (!p) {
        setJustSynced(true);
        setTimeout(() => setJustSynced(false), 2000);
      }
    });

    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      document.removeEventListener("visibilitychange", handleVisibility);
      clearInterval(poll);
      unsub();
    };
  }, []);

  if (!pending && !justSynced) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs shadow-sm text-muted-foreground">
      {pending ? (
        <>
          <CloudArrowUp weight="light" className="h-3.5 w-3.5 animate-pulse text-primary" />
          저장 중…
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
