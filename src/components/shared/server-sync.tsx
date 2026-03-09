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
