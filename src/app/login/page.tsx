"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LockSimple } from "@phosphor-icons/react";

// 접속 코드: 숫자 6자리
function formatCodeInput(raw: string): string {
  return raw.replace(/[^0-9]/g, "").slice(0, 6);
}

function LoginForm() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (res.ok) {
        const from = searchParams.get("from") || "/";
        // window.location 으로 풀 페이지 이동: 새 쿠키를 확실히 포함하여 미들웨어 통과
        window.location.href = from;
      } else {
        const data = await res.json().catch(() => ({}));
        setError((data as { error?: string }).error || "접속 코드가 올바르지 않습니다.");
        setSubmitting(false);
      }
    } catch {
      setError("서버 오류가 발생했습니다.");
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-sm">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-primary mb-3">
            <LockSimple weight="light" className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">관악교회 교적부</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            발급받은 본인의 접속 코드를 입력하세요
          </p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="off"
            spellCheck={false}
            value={code}
            onChange={(e) => {
              setCode(formatCodeInput(e.target.value));
              setError("");
            }}
            placeholder="숫자 6자리"
            // biome-ignore lint/a11y/noAutofocus: intentional focus on single-field login form
            autoFocus
            className="flex h-11 w-full rounded-md border bg-background px-3 py-2 text-center font-mono text-lg tracking-[0.5em] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          {error && <p className="text-sm text-destructive">{error}</p>}
          <button
            type="submit"
            disabled={submitting || code.length !== 6}
            className="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-light disabled:opacity-50"
          >
            {submitting ? "확인 중..." : "접속"}
          </button>
        </form>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          코드를 잊으셨으면 관리자에게 재발급을 요청하세요.
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-muted-foreground">
          로딩 중...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
