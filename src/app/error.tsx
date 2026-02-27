"use client";

// biome-ignore lint/suspicious/noShadowRestrictedNames: Next.js requires this file to export a default component named "Error"
export default function Error({ reset: onReset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <h2 className="text-lg font-semibold">오류가 발생했습니다</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        잠시 후 다시 시도해 주세요.
      </p>
      <button
        type="button"
        onClick={onReset}
        className="mt-4 inline-flex h-9 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary-light"
      >
        다시 시도
      </button>
    </div>
  );
}
