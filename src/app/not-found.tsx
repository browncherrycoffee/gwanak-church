import Link from "next/link";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/ssr";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="text-center">
        <MagnifyingGlass weight="thin" className="mx-auto mb-6 h-16 w-16 text-muted-foreground/50" />
        <h1 className="text-4xl font-bold">404</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          페이지를 찾을 수 없습니다
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          요청하신 페이지가 존재하지 않거나 이동되었습니다.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">홈으로 돌아가기</Link>
        </Button>
      </div>
    </div>
  );
}
